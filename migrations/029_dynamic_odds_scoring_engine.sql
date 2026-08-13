-- FC Barrios 2.0
-- Patch 029: Know Your Club — dynamisk oddsscoring
--
-- Formål:
--   1. Utvide calculate_prediction_points() til å håndtere
--      model_type='dynamic_odds' i TILLEGG til den eksisterende
--      tier_matrix-motoren. Den eksisterende tier-logikken er ikke
--      endret — kun flyttet inn i en "else"-gren.
--   2. Additiv poengberegning for dynamic_odds, slik punkt 40 i
--      visjonsdokumentet beskriver:
--        riktig utfall  → oddsbaserte X poeng (fra score_models.config)
--        + riktig målforskjell → config.difference_bonus
--        + eksakt resultat     → config.exact_bonus
--      Poengverdien for "riktig utfall" hentes fra match_odds-raden
--      som er markert is_scoring_snapshot = true for kampen, slik at
--      scoringen er deterministisk (punkt 28).
--   3. Minimal, TYDELIG MERKET testdata: én aktiv dynamic_odds-modell,
--      én runde og ÉN kamp (Arsenal – Aston Villa) med odds-snapshot,
--      for Know Your Club 2026/27. Ren testdata — ingen ekte fixture-
--      sync. Rører ikke EM 2028 i det hele tatt.
--
-- Trygg å kjøre etter 028.

begin;

-- ---------------------------------------------------------------
-- 1. calculate_prediction_points() — dispatch på model_type
-- ---------------------------------------------------------------

create or replace function public.calculate_prediction_points(target_prediction_id uuid)
returns table(points numeric, score_type text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.predictions;
  m public.matches;
  model public.score_models;
  tip_out text;
  actual_out text;
  sel text;
  diff integer;
  kind text;
  odds_snapshot public.match_odds;
  odds_used numeric;
  outcome_points numeric;
  diff_correct boolean;
  exact_correct boolean;
  bonus_diff numeric;
  bonus_exact numeric;
begin
  select * into p from public.predictions where id = target_prediction_id;
  select * into m from public.matches where id = p.match_id;

  if m.home_score is null or m.away_score is null then
    return query select 0::numeric, null::text; return;
  end if;

  select * into model
  from public.score_models
  where tournament_id = p.tournament_id and is_active = true
  limit 1;

  tip_out := case
    when p.home_score > p.away_score then 'home'
    when p.home_score < p.away_score then 'away'
    else 'draw'
  end;
  actual_out := case
    when m.home_score > m.away_score then 'home'
    when m.home_score < m.away_score then 'away'
    else 'draw'
  end;

  -- ----- DYNAMIC_ODDS (Know Your Club) -----
  if model.model_type = 'dynamic_odds' then
    if tip_out <> actual_out then
      return query select 0::numeric, null::text; return;
    end if;

    select * into odds_snapshot
    from public.match_odds
    where match_id = m.id and is_scoring_snapshot = true
    limit 1;

    if odds_snapshot.id is null then
      -- Riktig utfall, men ingen låst odds-snapshot å score mot ennå.
      return query select 0::numeric, 'missing_odds'::text; return;
    end if;

    odds_used := case actual_out
      when 'home' then odds_snapshot.home_odds
      when 'away' then odds_snapshot.away_odds
      else odds_snapshot.draw_odds
    end;

    outcome_points := coalesce((
      select (band ->> 'points')::numeric
      from jsonb_array_elements(coalesce(model.config -> 'outcome_bands', '[]'::jsonb)) as band
      where (band ->> 'max_odds') is null
        or odds_used <= (band ->> 'max_odds')::numeric
      order by
        case when (band ->> 'max_odds') is null then 1 else 0 end,
        (band ->> 'max_odds')::numeric asc
      limit 1
    ), 0);

    diff_correct := (p.home_score - p.away_score) = (m.home_score - m.away_score);
    exact_correct := p.home_score = m.home_score and p.away_score = m.away_score;

    bonus_diff := case when diff_correct
      then coalesce((model.config ->> 'difference_bonus')::numeric, 0) else 0 end;
    bonus_exact := case when exact_correct
      then coalesce((model.config ->> 'exact_bonus')::numeric, 0) else 0 end;

    kind := case
      when exact_correct then 'exact'
      when diff_correct then 'difference'
      else 'outcome'
    end;

    return query select (outcome_points + bonus_diff + bonus_exact), kind;
    return;
  end if;

  -- ----- TIER_MATRIX (eksisterende VM/EM-motor, UENDRET) -----
  if tip_out <> actual_out then
    return query select 0::numeric, null::text; return;
  end if;

  diff := abs(coalesce(m.home_tier, 4) - coalesce(m.away_tier, 4));
  sel := case
    when actual_out = 'draw' then 'draw'
    when actual_out = 'home' and coalesce(m.home_tier, 4) <= coalesce(m.away_tier, 4) then 'favorite'
    when actual_out = 'away' and coalesce(m.away_tier, 4) <= coalesce(m.home_tier, 4) then 'favorite'
    else 'underdog'
  end;
  kind := case
    when p.home_score = m.home_score and p.away_score = m.away_score then 'exact'
    when (p.home_score - p.away_score) = (m.home_score - m.away_score) then 'difference'
    else 'outcome'
  end;

  return query
  select coalesce(sr.points, 0), kind
  from public.score_rules sr
  where sr.model_id = model.id
    and sr.stage = m.scoring_stage
    and sr.result_type = kind
    and sr.tier_difference = diff
    and sr.selection_type = sel
  limit 1;
end;
$$;

-- ---------------------------------------------------------------
-- 2. Aktiv dynamic_odds-modell for Know Your Club 2026/27
-- ---------------------------------------------------------------

with kyc as (
  select id from public.tournaments where slug = 'know-your-club-2026' limit 1
)
insert into public.score_models (tournament_id, name, model_type, is_active, config)
select
  kyc.id,
  'Know Your Club — dynamisk odds',
  'dynamic_odds',
  true,
  '{
    "outcome_bands": [
      {"max_odds": 1.50, "points": 1},
      {"max_odds": 2.20, "points": 2},
      {"max_odds": 3.50, "points": 3},
      {"max_odds": 6.00, "points": 4},
      {"max_odds": null, "points": 5}
    ],
    "difference_bonus": 2,
    "exact_bonus": 3
  }'::jsonb
from kyc
where not exists (
  select 1 from public.score_models sm where sm.tournament_id = kyc.id
);

-- ---------------------------------------------------------------
-- 3. Testrunde + testkamp: Arsenal – Aston Villa
-- ---------------------------------------------------------------
-- Ren testdata for å kunne prøve hele løpet (velg lag → se kamp →
-- tipp → score). Ingen ekte fixture-sync ennå (det er Patch 030).

with kyc as (
  select id from public.tournaments where slug = 'know-your-club-2026' limit 1
)
insert into public.tournament_rounds (
  tournament_id, slug, name, stage, display_order, opens_at, closes_at, status
)
select
  kyc.id, 'runde-8', 'Runde 8', 'league', 8, now(), now() + interval '9 days', 'open'
from kyc
on conflict (tournament_id, slug) do update set
  status = 'open',
  closes_at = excluded.closes_at,
  updated_at = now();

with kyc as (
  select id from public.tournaments where slug = 'know-your-club-2026' limit 1
),
rnd as (
  select r.id
  from public.tournament_rounds r
  join kyc on kyc.id = r.tournament_id
  where r.slug = 'runde-8'
),
home_team as (
  select id, name from public.teams
  where tournament_id = (select id from kyc) and code = 'ARS'
),
away_team as (
  select id, name from public.teams
  where tournament_id = (select id from kyc) and code = 'AVL'
)
insert into public.matches (
  tournament_id, round_id, external_id, round, stage_order, match_order,
  home_team_id, away_team_id, home_team, away_team,
  kickoff_at, tipping_opens_at, tipping_closes_at, status
)
select
  kyc.id, rnd.id, 'kyc26-demo-001', 'Runde 8', 8, 1,
  home_team.id, away_team.id, home_team.name, away_team.name,
  now() + interval '9 days',
  now(),
  now() + interval '9 days' - interval '15 minutes',
  'scheduled'
from kyc, rnd, home_team, away_team
on conflict (tournament_id, external_id) do update set
  round_id = excluded.round_id,
  kickoff_at = excluded.kickoff_at,
  tipping_opens_at = excluded.tipping_opens_at,
  tipping_closes_at = excluded.tipping_closes_at,
  status = excluded.status;

with target_match as (
  select id
  from public.matches
  where tournament_id = (select id from public.tournaments where slug = 'know-your-club-2026')
    and external_id = 'kyc26-demo-001'
)
insert into public.match_odds (
  match_id, provider, bookmaker, home_odds, draw_odds, away_odds, is_scoring_snapshot
)
select id, 'manual', 'demo', 1.45, 4.50, 6.80, true
from target_match
on conflict (match_id) where is_scoring_snapshot = true
do update set
  home_odds = excluded.home_odds,
  draw_odds = excluded.draw_odds,
  away_odds = excluded.away_odds,
  captured_at = now();

commit;
