-- FC Barrios 2.0
-- Patch 031: Systematisk opprydning — påmelding, låsing, full testrunde,
-- admin-verktøy for medlemmer og nyheter.
--
-- Dette er en samle-migrasjon som lukker flere hull identifisert i en
-- helhetlig gjennomgang av både EM 2028 og Know Your Club:
--
--   1. save_club_selection() meldte spilleren automatisk inn i
--      turneringen i stedet for å kreve manuell SQL fra admin.
--   2. lock_club_selections() — admin kan låse alle klubbvalg samlet.
--   3. Full Know Your Club-testrunde: 9 kamper til (18 lag), slik at
--      ALLE 20 klubbene nå har en kamp å teste tipping på, ikke bare
--      Arsenal og Aston Villa.
--   4. Generiske admin-funksjoner for medlemshåndtering
--      (get_admin_members, admin_search_players, admin_add_member,
--      admin_remove_member, admin_create_player) — samme problem gjaldt
--      BÅDE EM 2028 og Know Your Club: ingen UI fantes for dette.
--   5. Admin-funksjoner for nyheter (announcements-tabellen fantes
--      allerede med fullt RLS-oppsett, men ingen vei til å skrive dit).
--
-- Rører ikke eksisterende scoring, tier-motor eller EM 2028-data.
-- Trygg å kjøre etter 030 (som var ren frontend, ingen migrasjon).
-- NB: forrige SQL-migrasjon var 029 — denne hopper til 031 for å holde
-- nummerrekkefølgen ryddig fremover (030 var kun kodenavnet på
-- forside-patchen, ingen SQL-fil).

begin;

-- ---------------------------------------------------------------
-- 1. save_club_selection() — auto-påmelding i stedet for hard feil
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

  -- Meld spilleren automatisk inn i turneringen ved første klubbvalg,
  -- i stedet for å kreve at admin gjør det manuelt på forhånd.
  insert into public.tournament_members (tournament_id, player_id, role)
  values (target_tournament_id, target_player_id, 'player')
  on conflict (tournament_id, player_id) do nothing;

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

-- ---------------------------------------------------------------
-- 2. lock_club_selections() — admin låser alle valg samlet
-- ---------------------------------------------------------------

create or replace function public.lock_club_selections(target_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Ingen tilgang.';
  end if;

  update public.tournament_team_selections
  set locked_at = now()
  where tournament_id = target_tournament_id
    and locked_at is null;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.lock_club_selections(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 3. Full testrunde: resten av Premier League-rundens 18 lag
-- ---------------------------------------------------------------

with kyc as (
  select id from public.tournaments where slug = 'know-your-club-2026' limit 1
),
rnd as (
  select r.id
  from public.tournament_rounds r
  join kyc on kyc.id = r.tournament_id
  where r.slug = 'runde-8'
),
fixtures (external_id, match_order, home_code, away_code, home_odds, draw_odds, away_odds) as (
  values
    ('kyc26-demo-002', 2, 'LIV', 'BOU', 1.30, 5.50, 9.00),
    ('kyc26-demo-003', 3, 'MCI', 'FUL', 1.25, 6.00, 10.00),
    ('kyc26-demo-004', 4, 'CHE', 'BRE', 1.60, 4.20, 5.50),
    ('kyc26-demo-005', 5, 'TOT', 'EVE', 1.75, 3.80, 4.80),
    ('kyc26-demo-006', 6, 'NEW', 'CRY', 1.90, 3.60, 4.20),
    ('kyc26-demo-007', 7, 'MUN', 'SUN', 2.10, 3.40, 3.60),
    ('kyc26-demo-008', 8, 'BHA', 'NFO', 2.00, 3.50, 3.80),
    ('kyc26-demo-009', 9, 'LEE', 'HUL', 2.40, 3.30, 3.00),
    ('kyc26-demo-010', 10, 'IPS', 'COV', 2.60, 3.20, 2.80)
),
inserted_matches as (
  insert into public.matches (
    tournament_id, round_id, external_id, round, stage_order, match_order,
    home_team_id, away_team_id, home_team, away_team,
    kickoff_at, tipping_opens_at, tipping_closes_at, status
  )
  select
    kyc.id, rnd.id, f.external_id, 'Runde 8', 8, f.match_order,
    home_team.id, away_team.id, home_team.name, away_team.name,
    now() + interval '9 days',
    now(),
    now() + interval '9 days' - interval '15 minutes',
    'scheduled'
  from fixtures f
  cross join kyc
  cross join rnd
  join public.teams home_team on home_team.tournament_id = kyc.id and home_team.code = f.home_code
  join public.teams away_team on away_team.tournament_id = kyc.id and away_team.code = f.away_code
  on conflict (tournament_id, external_id) do update set
    round_id = excluded.round_id,
    kickoff_at = excluded.kickoff_at,
    tipping_opens_at = excluded.tipping_opens_at,
    tipping_closes_at = excluded.tipping_closes_at,
    status = excluded.status
  returning id, external_id
)
insert into public.match_odds (
  match_id, provider, bookmaker, home_odds, draw_odds, away_odds, is_scoring_snapshot
)
select im.id, 'manual', 'demo', f.home_odds, f.draw_odds, f.away_odds, true
from inserted_matches im
join fixtures f on f.external_id = im.external_id
on conflict (match_id) where is_scoring_snapshot = true
do update set
  home_odds = excluded.home_odds,
  draw_odds = excluded.draw_odds,
  away_odds = excluded.away_odds,
  captured_at = now();

-- ---------------------------------------------------------------
-- 4. Admin: medlemshåndtering (generisk — brukes av BÅDE EM 2028
--    og Know Your Club, samme problem gjaldt begge)
-- ---------------------------------------------------------------

create or replace function public.get_admin_members(target_tournament_id uuid)
returns table (
  player_id uuid,
  display_name text,
  email text,
  role public.member_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.email, tm.role, tm.joined_at
  from public.tournament_members tm
  join public.players p on p.id = tm.player_id
  where tm.tournament_id = target_tournament_id
    and public.is_tournament_admin(target_tournament_id)
  order by tm.joined_at;
$$;

grant execute on function public.get_admin_members(uuid) to authenticated;

create or replace function public.admin_search_players(search_query text)
returns table (
  player_id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.email
  from public.players p
  where (p.display_name ilike '%' || search_query || '%' or p.email ilike '%' || search_query || '%')
    and exists (
      select 1
      from public.tournament_members tm
      join public.players me on me.id = tm.player_id
      where me.auth_user_id = auth.uid()
        and tm.role in ('admin', 'owner')
    )
  order by p.display_name
  limit 20;
$$;

grant execute on function public.admin_search_players(text) to authenticated;

create or replace function public.admin_add_member(
  target_tournament_id uuid,
  target_player_id uuid,
  member_role public.member_role default 'player'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Ingen tilgang.';
  end if;

  insert into public.tournament_members (tournament_id, player_id, role)
  values (target_tournament_id, target_player_id, member_role)
  on conflict (tournament_id, player_id) do update set role = excluded.role;
end;
$$;

grant execute on function public.admin_add_member(uuid, uuid, public.member_role) to authenticated;

create or replace function public.admin_remove_member(
  target_tournament_id uuid,
  target_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Ingen tilgang.';
  end if;

  delete from public.tournament_members
  where tournament_id = target_tournament_id
    and player_id = target_player_id;
end;
$$;

grant execute on function public.admin_remove_member(uuid, uuid) to authenticated;

create or replace function public.admin_create_player(
  new_display_name text,
  new_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_player_id uuid;
begin
  if not exists (
    select 1
    from public.tournament_members tm
    join public.players me on me.id = tm.player_id
    where me.auth_user_id = auth.uid()
      and tm.role in ('admin', 'owner')
  ) then
    raise exception 'Ingen tilgang.';
  end if;

  if trim(coalesce(new_display_name, '')) = '' then
    raise exception 'Navn er påkrevd.';
  end if;

  insert into public.players (display_name, email, is_active)
  values (trim(new_display_name), nullif(trim(coalesce(new_email, '')), ''), true)
  returning id into new_player_id;

  return new_player_id;
end;
$$;

grant execute on function public.admin_create_player(text, text) to authenticated;

-- ---------------------------------------------------------------
-- 5. Admin: nyheter (announcements-tabellen fantes, ingen UI-vei inn)
-- ---------------------------------------------------------------

create or replace function public.get_admin_announcements(target_tournament_id uuid)
returns table (
  id uuid,
  title text,
  body text,
  icon text,
  category text,
  is_published boolean,
  published_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.title, a.body, a.icon, a.category, a.is_published, a.published_at, a.created_at
  from public.announcements a
  where a.tournament_id = target_tournament_id
    and public.is_tournament_admin(target_tournament_id)
  order by a.created_at desc;
$$;

grant execute on function public.get_admin_announcements(uuid) to authenticated;

create or replace function public.save_announcement(
  target_tournament_id uuid,
  target_announcement_id uuid,
  announcement_title text,
  announcement_body text,
  announcement_icon text,
  announcement_category text,
  announcement_is_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
  creator_id uuid;
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Ingen tilgang.';
  end if;

  select id into creator_id from public.players where auth_user_id = auth.uid();

  if target_announcement_id is null then
    insert into public.announcements (
      tournament_id, title, body, icon, category, is_published, published_at, created_by
    )
    values (
      target_tournament_id,
      trim(announcement_title),
      announcement_body,
      nullif(trim(coalesce(announcement_icon, '')), ''),
      coalesce(nullif(trim(coalesce(announcement_category, '')), ''), 'news'),
      coalesce(announcement_is_published, false),
      case when announcement_is_published then now() else null end,
      creator_id
    )
    returning id into result_id;
  else
    update public.announcements set
      title = trim(announcement_title),
      body = announcement_body,
      icon = nullif(trim(coalesce(announcement_icon, '')), ''),
      category = coalesce(nullif(trim(coalesce(announcement_category, '')), ''), 'news'),
      is_published = coalesce(announcement_is_published, false),
      published_at = case
        when announcement_is_published and published_at is null then now()
        when not announcement_is_published then null
        else published_at
      end
    where id = target_announcement_id
      and tournament_id = target_tournament_id
    returning id into result_id;
  end if;

  return result_id;
end;
$$;

grant execute on function public.save_announcement(uuid, uuid, text, text, text, text, boolean) to authenticated;

create or replace function public.delete_announcement(target_announcement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  select tournament_id into tid from public.announcements where id = target_announcement_id;

  if tid is null then
    raise exception 'Nyheten finnes ikke.';
  end if;

  if not public.is_tournament_admin(tid) then
    raise exception 'Ingen tilgang.';
  end if;

  delete from public.announcements where id = target_announcement_id;
end;
$$;

grant execute on function public.delete_announcement(uuid) to authenticated;

commit;
