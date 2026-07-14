-- FC Barrios 2.0
-- Migration 008: Result registration, automatic scoring and live leaderboard
-- Run after migration 007.

begin;

alter table public.matches
  add column if not exists result_updated_at timestamptz;

create or replace function public.set_match_result(
  target_match_id uuid,
  final_home_score integer,
  final_away_score integer,
  mark_finished boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tournament_id uuid;
  scored_count integer := 0;
begin
  if final_home_score < 0 or final_away_score < 0 then
    raise exception 'Resultatet kan ikke være negativt.';
  end if;

  if final_home_score > 30 or final_away_score > 30 then
    raise exception 'Resultatet er utenfor tillatt område.';
  end if;

  select tournament_id
  into target_tournament_id
  from public.matches
  where id = target_match_id;

  if target_tournament_id is null then
    raise exception 'Kampen finnes ikke.';
  end if;

  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å registrere resultater.';
  end if;

  update public.matches
  set
    home_score = final_home_score,
    away_score = final_away_score,
    status = case when mark_finished then 'finished' else status end,
    result_updated_at = now()
  where id = target_match_id;

  scored_count := public.score_match(target_match_id);

  return scored_count;
end;
$$;

grant execute on function public.set_match_result(uuid, integer, integer, boolean)
to authenticated;

drop view if exists public.leaderboard_view;
create or replace view public.leaderboard_view as
select
  tm.tournament_id,
  p.id,
  p.display_name as name,
  p.avatar_url,
  coalesce(sum(ps.points), 0)::numeric(10,2) as points,
  count(*) filter (where ps.score_type = 'exact')::integer as exact_hits,
  count(*) filter (where ps.score_type = 'difference')::integer as difference_hits,
  count(*) filter (where ps.score_type = 'outcome')::integer as outcome_hits,
  row_number() over (
    partition by tm.tournament_id
    order by
      coalesce(sum(ps.points), 0) desc,
      count(*) filter (where ps.score_type = 'exact') desc,
      count(*) filter (where ps.score_type = 'difference') desc,
      p.display_name
  )::integer as rank,
  coalesce((
    select sum(last_scores.points)
    from (
      select ps2.points
      from public.prediction_scores ps2
      join public.predictions pr2 on pr2.id = ps2.prediction_id
      join public.matches m2 on m2.id = pr2.match_id
      where ps2.tournament_id = tm.tournament_id
        and ps2.player_id = tm.player_id
      order by m2.kickoff_at desc nulls last
      limit 5
    ) last_scores
  ), 0)::numeric(10,2) as form_points,
  0::integer as movement
from public.tournament_members tm
join public.players p on p.id = tm.player_id
left join public.prediction_scores ps
  on ps.tournament_id = tm.tournament_id
 and ps.player_id = tm.player_id
group by tm.tournament_id, tm.player_id, p.id, p.display_name, p.avatar_url;

create or replace view public.match_scoring_summary_view as
select
  m.id as match_id,
  m.tournament_id,
  m.round_id,
  m.round,
  m.home_team,
  m.away_team,
  m.home_score,
  m.away_score,
  m.status,
  m.kickoff_at,
  count(pr.id)::integer as prediction_count,
  count(pr.id) filter (where ps.score_type = 'exact')::integer as exact_count,
  count(pr.id) filter (where ps.score_type = 'difference')::integer as difference_count,
  count(pr.id) filter (where ps.score_type = 'outcome')::integer as outcome_count,
  coalesce(sum(ps.points), 0)::numeric(10,2) as total_points_awarded
from public.matches m
left join public.predictions pr on pr.match_id = m.id
left join public.prediction_scores ps on ps.prediction_id = pr.id
group by
  m.id,
  m.tournament_id,
  m.round_id,
  m.round,
  m.home_team,
  m.away_team,
  m.home_score,
  m.away_score,
  m.status,
  m.kickoff_at;

commit;
