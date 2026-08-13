begin;

create table if not exists public.admin_jobs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  job_type text not null,
  entity_id uuid,
  status text not null default 'running' check (status in ('running','success','error')),
  message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_jobs_tournament_started_idx
  on public.admin_jobs (tournament_id, started_at desc);

alter table public.admin_jobs enable row level security;
drop policy if exists "Admins can read admin jobs" on public.admin_jobs;
create policy "Admins can read admin jobs"
on public.admin_jobs for select to authenticated
using (public.is_tournament_admin(tournament_id));

create or replace function public.resolve_match_bonus_results(target_match_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_match public.matches;
  target_game record;
  target_candidate_id uuid;
  total_goals integer;
  is_winner boolean;
  processed integer := 0;
begin
  select * into target_match from public.matches where id = target_match_id;
  if target_match.id is null then raise exception 'Kampen finnes ikke.'; end if;
  if target_match.home_score is null or target_match.away_score is null then
    raise exception 'Kampen mangler resultat.';
  end if;

  total_goals := target_match.home_score + target_match.away_score;

  for target_game in
    select * from public.bonus_games
    where tournament_id = target_match.tournament_id
      and code in ('goal-rich','goal-poor') and is_active = true
  loop
    select id into target_candidate_id
    from public.bonus_candidates
    where bonus_game_id = target_game.id
      and candidate_type = 'match'
      and reference_id = target_match.id
    limit 1;

    if target_candidate_id is null then continue; end if;

    is_winner := case
      when target_game.code = 'goal-rich' then total_goals >= coalesce(target_game.threshold_value,4)
      when target_game.code = 'goal-poor' then total_goals <= coalesce(target_game.threshold_value,1)
      else false
    end;

    insert into public.bonus_results (
      bonus_game_id,candidate_id,is_winner,result_value,metadata,resolved_at
    ) values (
      target_game.id,target_candidate_id,is_winner,total_goals,
      jsonb_build_object('match_id',target_match.id,'home_score',target_match.home_score,'away_score',target_match.away_score),
      now()
    )
    on conflict (bonus_game_id,candidate_id)
    do update set is_winner=excluded.is_winner,
      result_value=excluded.result_value,
      metadata=excluded.metadata,
      resolved_at=now();

    perform public.score_bonus_game(target_game.id);
    processed := processed + 1;
  end loop;

  return processed;
end;
$$;

grant execute on function public.resolve_match_bonus_results(uuid) to authenticated;

create or replace function public.process_match_result(
  target_match_id uuid,
  final_home_score integer,
  final_away_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tournament_id uuid;
  job_id uuid;
  scored_predictions integer := 0;
  processed_bonus_games integer := 0;
  total_points numeric(10,2) := 0;
  exact_count integer := 0;
  difference_count integer := 0;
  outcome_count integer := 0;
  payload jsonb;
begin
  if final_home_score < 0 or final_away_score < 0 then
    raise exception 'Resultatet kan ikke være negativt.';
  end if;

  select tournament_id into target_tournament_id
  from public.matches where id = target_match_id;

  if target_tournament_id is null then raise exception 'Kampen finnes ikke.'; end if;
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å registrere resultater.';
  end if;

  insert into public.admin_jobs (
    tournament_id,job_type,entity_id,status,message,created_by
  ) values (
    target_tournament_id,'process_match_result',target_match_id,'running','Resultatbehandling startet',auth.uid()
  ) returning id into job_id;

  begin
    update public.matches
    set home_score=final_home_score,
        away_score=final_away_score,
        status='finished',
        result_updated_at=now()
    where id=target_match_id;

    scored_predictions := public.score_match(target_match_id);
    processed_bonus_games := public.resolve_match_bonus_results(target_match_id);

    select coalesce(sum(ps.points),0),
      count(*) filter (where ps.score_type='exact'),
      count(*) filter (where ps.score_type='difference'),
      count(*) filter (where ps.score_type='outcome')
    into total_points,exact_count,difference_count,outcome_count
    from public.prediction_scores ps
    join public.predictions pr on pr.id=ps.prediction_id
    where pr.match_id=target_match_id;

    payload := jsonb_build_object(
      'job_id',job_id,
      'match_id',target_match_id,
      'predictions_scored',scored_predictions,
      'bonus_games_processed',processed_bonus_games,
      'points_awarded',total_points,
      'exact_hits',exact_count,
      'difference_hits',difference_count,
      'outcome_hits',outcome_count
    );

    update public.admin_jobs
    set status='success',message='Resultat og poeng er ferdig behandlet',details=payload,finished_at=now()
    where id=job_id;

    return payload;
  exception when others then
    update public.admin_jobs set status='error',message=sqlerrm,finished_at=now() where id=job_id;
    raise;
  end;
end;
$$;

grant execute on function public.process_match_result(uuid,integer,integer) to authenticated;

create or replace function public.get_admin_dashboard(target_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'players',(select count(*) from public.tournament_members where tournament_id=target_tournament_id),
    'matches_total',(select count(*) from public.matches where tournament_id=target_tournament_id),
    'matches_finished',(select count(*) from public.matches where tournament_id=target_tournament_id and status='finished'),
    'matches_remaining',(select count(*) from public.matches where tournament_id=target_tournament_id and status<>'finished'),
    'predictions',(select count(*) from public.predictions where tournament_id=target_tournament_id)
  );
$$;

grant execute on function public.get_admin_dashboard(uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
