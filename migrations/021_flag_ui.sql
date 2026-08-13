begin;

drop function if exists public.get_community_predictions(uuid, integer);

create function public.get_community_predictions(
  target_tournament_id uuid,
  max_matches integer default 4
)
returns table(
  match_id uuid,
  home_team text,
  away_team text,
  home_country_code text,
  away_country_code text,
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
set search_path=public
as $$
with aggregate_rows as (
  select
    m.id as match_id,
    m.home_team,
    m.away_team,
    home_team.country_code as home_country_code,
    away_team.country_code as away_country_code,
    m.kickoff_at,
    m.tipping_closes_at,
    m.status,
    count(pr.id)::integer as total_count,
    count(pr.id) filter(where pr.home_score > pr.away_score)::integer as home_count,
    count(pr.id) filter(where pr.home_score = pr.away_score)::integer as draw_count,
    count(pr.id) filter(where pr.home_score < pr.away_score)::integer as away_count,
    mode() within group(order by pr.home_score::text || '–' || pr.away_score::text) as common_score
  from public.matches m
  left join public.teams home_team on home_team.id = m.home_team_id
  left join public.teams away_team on away_team.id = m.away_team_id
  left join public.predictions pr on pr.match_id = m.id
  where m.tournament_id = target_tournament_id
  group by
    m.id, m.home_team, m.away_team,
    home_team.country_code, away_team.country_code,
    m.kickoff_at, m.tipping_closes_at, m.status
), visibility as (
  select aggregate_rows.*,
    (now() >= coalesce(tipping_closes_at, kickoff_at) or status in ('live','finished')) as visible
  from aggregate_rows
)
select
  match_id, home_team, away_team, home_country_code, away_country_code, kickoff_at,
  case when visible then home_count else 0 end,
  case when visible then draw_count else 0 end,
  case when visible then away_count else 0 end,
  case when visible then total_count else 0 end,
  case when visible and total_count > 0 then round(100.0 * home_count / total_count, 0) else 0 end,
  case when visible and total_count > 0 then round(100.0 * draw_count / total_count, 0) else 0 end,
  case when visible and total_count > 0 then round(100.0 * away_count / total_count, 0) else 0 end,
  case when visible then common_score else null end,
  visible
from visibility
order by kickoff_at
limit greatest(1, least(max_matches, 12));
$$;

grant execute on function public.get_community_predictions(uuid, integer)
to anon, authenticated;

commit;
notify pgrst, 'reload schema';
