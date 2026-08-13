-- FC Barrios 2.0
-- Patch 027: Know Your Club — mock UI + favorittlagvalg
--
-- Formål:
--   1. RPC-funksjoner for å lese/lagre en spillers klubbvalg, etter
--      samme mønster som get_my_predictions/save_prediction: identitet
--      løses server-side via auth.uid(), klienten sender aldri inn
--      player_id direkte.
--   2. En liten, tydelig merket "planning"-turnering (Know Your Club
--      2026/27) med en håndfull Premier League-lag, KUN for at
--      klubbvalg-siden skal kunne testes med ekte data. Ingen kamper,
--      ingen runder, ingen scoring ennå — det kommer i senere patcher.
--
-- Rører ikke EM 2028, calculate_prediction_points() eller noe annet
-- eksisterende. Trygg å kjøre etter 026.

begin;

-- ---------------------------------------------------------------
-- 1. RPC: hent mitt klubbvalg for en gitt turnering
-- ---------------------------------------------------------------

create or replace function public.get_my_club_selection(
  target_tournament_id uuid
)
returns table (
  team_id uuid,
  locked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.team_id,
    s.locked_at
  from public.tournament_team_selections s
  join public.players p on p.id = s.player_id
  where s.tournament_id = target_tournament_id
    and p.auth_user_id = auth.uid();
$$;

grant execute on function public.get_my_club_selection(uuid)
to authenticated;

-- ---------------------------------------------------------------
-- 2. RPC: velg/endre klubb (før lås)
-- ---------------------------------------------------------------

create or replace function public.save_club_selection(
  target_tournament_id uuid,
  target_team_id uuid
)
returns public.tournament_team_selections
language plpgsql
security definer
set search_path = public
as $$
declare
  target_player_id uuid;
  existing_selection public.tournament_team_selections;
  saved_selection public.tournament_team_selections;
begin
  if auth.uid() is null then
    raise exception 'Du må være logget inn.';
  end if;

  select p.id
  into target_player_id
  from public.players p
  where p.auth_user_id = auth.uid();

  if target_player_id is null then
    raise exception 'Fant ingen spillerprofil for denne kontoen.';
  end if;

  if not exists (
    select 1
    from public.tournament_members tm
    where tm.tournament_id = target_tournament_id
      and tm.player_id = target_player_id
  ) then
    raise exception 'Du er ikke medlem av denne turneringen.';
  end if;

  if not exists (
    select 1
    from public.teams t
    where t.id = target_team_id
      and t.tournament_id = target_tournament_id
  ) then
    raise exception 'Ugyldig lag for denne turneringen.';
  end if;

  select *
  into existing_selection
  from public.tournament_team_selections
  where tournament_id = target_tournament_id
    and player_id = target_player_id;

  if existing_selection.locked_at is not null then
    raise exception 'Lagvalget er låst og kan ikke endres.';
  end if;

  insert into public.tournament_team_selections (
    tournament_id, player_id, team_id
  )
  values (
    target_tournament_id, target_player_id, target_team_id
  )
  on conflict (tournament_id, player_id)
  do update set
    team_id = excluded.team_id,
    updated_at = now()
  returning * into saved_selection;

  return saved_selection;
end;
$$;

grant execute on function public.save_club_selection(uuid, uuid)
to authenticated;

-- ---------------------------------------------------------------
-- 3. Minimal seed: Know Your Club 2026/27 (kun for testing av UI)
-- ---------------------------------------------------------------
-- status = 'planning' → dukker ikke opp som aktiv turnering noe sted
-- (appConfig.activeTournamentSlug peker fortsatt på euro-2028).
-- Ingen matches/rounds legges inn her — kun turnering + lag, nok til
-- at klubbvalg-siden kan hente og lagre et ekte valg.

insert into public.tournaments (
  slug, name, short_name, status, settings
)
values (
  'know-your-club-2026',
  'Know Your Club 2026/27',
  'KYC 26/27',
  'planning',
  '{"format": "club_challenge"}'::jsonb
)
on conflict (slug) do nothing;

insert into public.teams (tournament_id, code, name, short_name, country_code)
select t.id, v.code, v.name, v.short_name, 'GB-ENG'
from public.tournaments t
cross join (values
  ('ARS', 'Arsenal', 'Arsenal'),
  ('LIV', 'Liverpool', 'Liverpool'),
  ('MCI', 'Manchester City', 'Man City'),
  ('MUN', 'Manchester United', 'Man United'),
  ('CHE', 'Chelsea', 'Chelsea'),
  ('TOT', 'Tottenham Hotspur', 'Tottenham'),
  ('NEW', 'Newcastle United', 'Newcastle'),
  ('AVL', 'Aston Villa', 'Aston Villa')
) as v(code, name, short_name)
where t.slug = 'know-your-club-2026'
on conflict (tournament_id, code) do nothing;

commit;
