begin;

-- Enriched leaderboard without changing the existing leaderboard_view contract.
create or replace function public.get_leaderboard_2(target_tournament_id uuid)
returns table (
  id uuid,
  name text,
  avatar_url text,
  rank integer,
  points numeric,
  match_points numeric,
  bonus_points numeric,
  exact_hits integer,
  difference_hits integer,
  outcome_hits integer,
  form_points numeric,
  movement integer,
  last_match_points numeric,
  buy_in_tier integer,
  payment_status text,
  is_paid boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with last_finished_match as (
    select m.id
    from public.matches m
    where m.tournament_id = target_tournament_id
      and m.status = 'finished'
    order by m.kickoff_at desc nulls last
    limit 1
  ),
  last_points as (
    select
      ps.player_id,
      coalesce(sum(ps.points), 0)::numeric(10,2) as points
    from public.prediction_scores ps
    join public.predictions pr on pr.id = ps.prediction_id
    where pr.match_id = (select id from last_finished_match)
    group by ps.player_id
  )
  select
    lv.id,
    lv.name,
    lv.avatar_url,
    lv.rank,
    lv.points,
    lv.match_points,
    lv.bonus_points,
    lv.exact_hits,
    lv.difference_hits,
    lv.outcome_hits,
    lv.form_points,
    lv.movement,
    coalesce(lp.points, 0)::numeric(10,2) as last_match_points,
    tm.buy_in_tier,
    tm.payment_status,
    tm.payment_status = 'paid' as is_paid
  from public.leaderboard_view lv
  join public.tournament_members tm
    on tm.tournament_id = lv.tournament_id
   and tm.player_id = lv.id
  left join last_points lp on lp.player_id = lv.id
  where lv.tournament_id = target_tournament_id
  order by lv.rank;
$$;

grant execute on function public.get_leaderboard_2(uuid)
to anon, authenticated;

commit;
notify pgrst, 'reload schema';
