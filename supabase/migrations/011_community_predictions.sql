-- FC Barrios 2.0
-- Migration 011: Community prediction distribution
-- Run after migration 010.

begin;

create or replace function public.get_community_predictions(
  target_tournament_id uuid,
  max_matches integer default 4
)
returns table (
  match_id uuid,
  home_team text,
  away_team text,
  kickoff_at timestamptz,
  home_count integer,
  draw_count integer,
  away_count integer,
  total_count integer,
  home_pct numeric,
  draw_pct numeric,
  away_pct numeric,
  common_score text,
  is_visible boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with current_player as (
    select p.id
    from public.players p
    where p.auth_user_id = auth.uid()
    limit 1
  ),
  match_predictions as (
    select
      m.id as match_id,
      m.home_team,
      m.away_team,
      m.kickoff_at,
      m.tipping_closes_at,
      m.status,
      count(pr.id)::integer as total_count,
      count(pr.id) filter (
        where pr.home_score > pr.away_score
      )::integer as home_count,
      count(pr.id) filter (
        where pr.home_score = pr.away_score
      )::integer as draw_count,
      count(pr.id) filter (
        where pr.home_score < pr.away_score
      )::integer as away_count,
      mode() within group (
        order by pr.home_score::text || '–' || pr.away_score::text
      ) as common_score,
      exists (
        select 1
        from public.predictions my_prediction
        join current_player cp
          on cp.id = my_prediction.player_id
        where my_prediction.match_id = m.id
      ) as requester_has_prediction
    from public.matches m
    left join public.predictions pr
      on pr.match_id = m.id
    where m.tournament_id = target_tournament_id
    group by
      m.id,
      m.home_team,
      m.away_team,
      m.kickoff_at,
      m.tipping_closes_at,
      m.status
  )
  select
    mp.match_id,
    mp.home_team,
    mp.away_team,
    mp.kickoff_at,
    case when visible then mp.home_count else 0 end,
    case when visible then mp.draw_count else 0 end,
    case when visible then mp.away_count else 0 end,
    case when visible then mp.total_count else 0 end,
    case
      when visible and mp.total_count > 0
      then round(100.0 * mp.home_count / mp.total_count, 0)
      else 0
    end,
    case
      when visible and mp.total_count > 0
      then round(100.0 * mp.draw_count / mp.total_count, 0)
      else 0
    end,
    case
      when visible and mp.total_count > 0
      then round(100.0 * mp.away_count / mp.total_count, 0)
      else 0
    end,
    case when visible then mp.common_score else null end,
    visible
  from (
    select
      mp.*,
      (
        mp.requester_has_prediction
        or now() >= coalesce(mp.tipping_closes_at, mp.kickoff_at)
        or mp.status in ('live', 'finished')
      ) as visible
    from match_predictions mp
  ) mp
  order by mp.kickoff_at
  limit greatest(1, least(max_matches, 12));
$$;

grant execute on function public.get_community_predictions(uuid, integer)
to anon, authenticated;

commit;

notify pgrst, 'reload schema';
