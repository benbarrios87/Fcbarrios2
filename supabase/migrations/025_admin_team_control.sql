-- FC Barrios 2.0
-- Patch 025: Complete Admin -> Teams control for RTG multiplier and tournament progress.
-- Safe to run after earlier team/admin migrations.

begin;

alter table public.teams
  add column if not exists rtg_multiplier numeric(10,3) not null default 1,
  add column if not exists competition_status text not null default 'not_started';

alter table public.teams
  drop constraint if exists teams_rtg_multiplier_check;

alter table public.teams
  add constraint teams_rtg_multiplier_check
  check (rtg_multiplier >= 0);

alter table public.teams
  drop constraint if exists teams_competition_status_check;

alter table public.teams
  add constraint teams_competition_status_check
  check (competition_status in (
    'not_started',
    'group',
    'round32',
    'round16',
    'quarterfinal',
    'semifinal',
    'bronze_match',
    'bronze_winner',
    'finalist',
    'champion',
    'eliminated_group',
    'eliminated_round32',
    'eliminated_round16',
    'eliminated_quarterfinal',
    'eliminated_semifinal',
    'runner_up'
  ));

-- Admin list with all fields needed by the team-control page.
drop function if exists public.get_admin_teams(uuid);

create function public.get_admin_teams(
  target_tournament_id uuid
)
returns table (
  id uuid,
  code text,
  name text,
  short_name text,
  tier smallint,
  country_code text,
  group_name text,
  is_active boolean,
  rtg_multiplier numeric,
  competition_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.code,
    t.name,
    t.short_name,
    t.tier,
    t.country_code,
    t.group_name,
    t.is_active,
    t.rtg_multiplier,
    t.competition_status
  from public.teams t
  where t.tournament_id = target_tournament_id
    and public.is_tournament_admin(target_tournament_id)
  order by t.is_active desc, t.group_name nulls last, t.name;
$$;

grant execute on function public.get_admin_teams(uuid) to authenticated;

-- Remove both the old and the new overload before recreating the canonical function.
drop function if exists public.upsert_tournament_team(
  uuid, uuid, text, text, text, integer, text, text
);
drop function if exists public.upsert_tournament_team(
  uuid, uuid, text, text, text, integer, text, text, numeric, text
);

create function public.upsert_tournament_team(
  target_tournament_id uuid,
  target_team_id uuid,
  target_code text,
  target_name text,
  target_short_name text,
  target_tier integer,
  target_country_code text,
  target_group_name text,
  target_rtg_multiplier numeric,
  target_competition_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  clean_code text := upper(trim(coalesce(target_code, '')));
  clean_country_code text := upper(nullif(trim(coalesce(target_country_code, '')), ''));
  clean_status text := lower(trim(coalesce(target_competition_status, 'not_started')));
  clean_name text := trim(coalesce(target_name, ''));
  rtg_game_id uuid;
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å endre lag.';
  end if;

  if clean_code = '' or clean_name = '' then
    raise exception 'Lag og kode må fylles ut.';
  end if;

  if target_tier not between 1 and 4 then
    raise exception 'Tier må være mellom 1 og 4.';
  end if;

  if clean_country_code is not null and clean_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Landskode må være to bokstaver, for eksempel NO.';
  end if;

  if coalesce(target_rtg_multiplier, 1) < 0 then
    raise exception 'RTG-multiplikatoren kan ikke være negativ.';
  end if;

  if clean_status not in (
    'not_started','group','round32','round16','quarterfinal','semifinal',
    'bronze_match','bronze_winner','finalist','champion','eliminated_group',
    'eliminated_round32','eliminated_round16','eliminated_quarterfinal',
    'eliminated_semifinal','runner_up'
  ) then
    raise exception 'Ugyldig turneringsstatus.';
  end if;

  if target_team_id is null then
    insert into public.teams (
      tournament_id,
      code,
      name,
      short_name,
      tier,
      country_code,
      group_name,
      is_active,
      rtg_multiplier,
      competition_status
    )
    values (
      target_tournament_id,
      clean_code,
      clean_name,
      nullif(trim(coalesce(target_short_name, '')), ''),
      target_tier,
      clean_country_code,
      nullif(trim(coalesce(target_group_name, '')), ''),
      true,
      coalesce(target_rtg_multiplier, 1),
      clean_status
    )
    returning id into saved_id;
  else
    update public.teams
    set
      code = clean_code,
      name = clean_name,
      short_name = nullif(trim(coalesce(target_short_name, '')), ''),
      tier = target_tier,
      country_code = clean_country_code,
      group_name = nullif(trim(coalesce(target_group_name, '')), ''),
      rtg_multiplier = coalesce(target_rtg_multiplier, 1),
      competition_status = clean_status
    where id = target_team_id
      and tournament_id = target_tournament_id
    returning id into saved_id;

    if saved_id is null then
      raise exception 'Fant ikke laget i denne turneringen.';
    end if;
  end if;

  -- Keep the RTG candidate in sync when an RTG bonus game exists.
  select bg.id
  into rtg_game_id
  from public.bonus_games bg
  where bg.tournament_id = target_tournament_id
    and lower(bg.code) = 'rtg'
  limit 1;

  if rtg_game_id is not null then
    update public.bonus_candidates bc
    set
      label = clean_name,
      tier = target_tier,
      multiplier = coalesce(target_rtg_multiplier, 1),
      metadata = coalesce(bc.metadata, '{}'::jsonb) || jsonb_build_object(
        'country_code', clean_country_code,
        'competition_status', clean_status
      ),
      is_active = true
    where bc.bonus_game_id = rtg_game_id
      and bc.candidate_type = 'team'
      and bc.reference_id = saved_id;

    if not found then
      insert into public.bonus_candidates (
        bonus_game_id,
        candidate_type,
        reference_id,
        label,
        tier,
        multiplier,
        display_order,
        metadata,
        is_active
      )
      values (
        rtg_game_id,
        'team',
        saved_id,
        clean_name,
        target_tier,
        coalesce(target_rtg_multiplier, 1),
        target_tier * 100,
        jsonb_build_object(
          'country_code', clean_country_code,
          'competition_status', clean_status
        ),
        true
      )
      on conflict (bonus_game_id, candidate_type, label)
      do update set
        reference_id = excluded.reference_id,
        tier = excluded.tier,
        multiplier = excluded.multiplier,
        metadata = excluded.metadata,
        is_active = true;
    end if;
  end if;

  return saved_id;
end;
$$;

grant execute on function public.upsert_tournament_team(
  uuid, uuid, text, text, text, integer, text, text, numeric, text
) to authenticated;

commit;
