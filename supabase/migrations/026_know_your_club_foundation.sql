-- FC Barrios 2.0
-- Patch 026: Know Your Club — databasefundament
--
-- Formål:
--   1. Gjøre score_models i stand til å skille mellom eksisterende
--      tier-basert scoring og en fremtidig oddsbasert scoring,
--      uten å endre eksisterende beregningslogikk.
--   2. Legge til tabell for turneringsspesifikt klubbvalg per spiller
--      (Know Your Club: én spiller = ett lag per turnering).
--   3. Legge til tabell for odds-snapshot per kamp, slik at scoring
--      senere kan gjøres deterministisk og ikke endres retroaktivt.
--
-- Dette er REN databaseutvidelse. Ingen eksisterende tabeller,
-- funksjoner (inkl. calculate_prediction_points/score_match) eller
-- migrasjoner endres i sin virkemåte. Trygg å kjøre etter 025.

begin;

-- ---------------------------------------------------------------
-- 1. Scoring-type på score_models (bakoverkompatibel)
-- ---------------------------------------------------------------

alter table public.score_models
  add column if not exists model_type text not null default 'tier_matrix';

alter table public.score_models
  drop constraint if exists score_models_model_type_check;

alter table public.score_models
  add constraint score_models_model_type_check
  check (model_type in ('tier_matrix', 'dynamic_odds'));

alter table public.score_models
  add column if not exists config jsonb not null default '{}'::jsonb;

comment on column public.score_models.model_type is
  'tier_matrix = eksisterende VM/EM-motor (score_rules-basert). dynamic_odds = fremtidig Know Your Club-motor konfigurert via config.';

comment on column public.score_models.config is
  'Kun brukt av model_type=dynamic_odds. Forventet form: {"outcome_bands":[{"max_odds":1.5,"points":1}, ...], "difference_bonus":2, "exact_bonus":3}. Ubrukt/tomt for tier_matrix.';

-- Eksisterende score_models-rader er alle tier_matrix fra før av
-- (default-verdien over dekker dette automatisk for både gamle og
-- nye rader, så ingen backfill nødvendig).

-- ---------------------------------------------------------------
-- 2. Klubbvalg per spiller per turnering (Know Your Club)
-- ---------------------------------------------------------------

create table if not exists public.tournament_team_selections (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create index if not exists tournament_team_selections_tournament_idx
  on public.tournament_team_selections (tournament_id);

create index if not exists tournament_team_selections_team_idx
  on public.tournament_team_selections (tournament_id, team_id);

alter table public.tournament_team_selections enable row level security;

drop policy if exists "Public can read team selections"
  on public.tournament_team_selections;

create policy "Public can read team selections"
on public.tournament_team_selections for select
to anon, authenticated
using (true);

drop policy if exists "Players can select own team before lock"
  on public.tournament_team_selections;

create policy "Players can select own team before lock"
on public.tournament_team_selections for insert
to authenticated
with check (
  locked_at is null
  and exists (
    select 1 from public.players p
    where p.id = tournament_team_selections.player_id
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1 from public.tournament_members tm
    where tm.tournament_id = tournament_team_selections.tournament_id
      and tm.player_id = tournament_team_selections.player_id
  )
);

drop policy if exists "Players can change own team before lock"
  on public.tournament_team_selections;

create policy "Players can change own team before lock"
on public.tournament_team_selections for update
to authenticated
using (
  locked_at is null
  and exists (
    select 1 from public.players p
    where p.id = tournament_team_selections.player_id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  locked_at is null
  and exists (
    select 1 from public.players p
    where p.id = tournament_team_selections.player_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins manage team selections"
  on public.tournament_team_selections;

create policy "Admins manage team selections"
on public.tournament_team_selections for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

-- ---------------------------------------------------------------
-- 3. Odds-snapshot per kamp
-- ---------------------------------------------------------------

create table if not exists public.match_odds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  provider text,
  bookmaker text,
  home_odds numeric(8,3) check (home_odds > 0),
  draw_odds numeric(8,3) check (draw_odds > 0),
  away_odds numeric(8,3) check (away_odds > 0),
  captured_at timestamptz not null default now(),
  is_scoring_snapshot boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists match_odds_match_idx
  on public.match_odds (match_id, captured_at desc);

-- Kun én "scoring snapshot" per kamp, slik at senere API-oppdateringer
-- aldri kan endre poengverdien til en kamp retroaktivt.
create unique index if not exists match_odds_one_scoring_snapshot_idx
  on public.match_odds (match_id)
  where is_scoring_snapshot = true;

alter table public.match_odds enable row level security;

drop policy if exists "Public can read match odds"
  on public.match_odds;

create policy "Public can read match odds"
on public.match_odds for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage match odds"
  on public.match_odds;

create policy "Admins manage match odds"
on public.match_odds for all
to authenticated
using (
  public.is_tournament_admin(
    (select tournament_id from public.matches where id = match_odds.match_id)
  )
)
with check (
  public.is_tournament_admin(
    (select tournament_id from public.matches where id = match_odds.match_id)
  )
);

commit;
