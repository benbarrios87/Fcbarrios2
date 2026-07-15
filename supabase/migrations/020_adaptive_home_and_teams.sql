begin;

alter table public.teams
  add column if not exists country_code text,
  add column if not exists is_active boolean not null default true;

create index if not exists teams_tournament_active_idx
  on public.teams (tournament_id, is_active, name);

create or replace function public.update_tournament_status(
  target_tournament_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å endre turneringsmodus.';
  end if;

  if target_status not in ('registration', 'live', 'finished') then
    raise exception 'Ugyldig turneringsmodus.';
  end if;

  update public.tournaments
  set status = target_status::public.tournament_status,
      updated_at = now()
  where id = target_tournament_id;
end;
$$;

grant execute on function public.update_tournament_status(uuid, text)
to authenticated;

create or replace function public.get_admin_teams(
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
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    teams.id,
    teams.code,
    teams.name,
    teams.short_name,
    teams.tier,
    teams.country_code,
    teams.group_name,
    teams.is_active
  from public.teams
  where teams.tournament_id = target_tournament_id
    and public.is_tournament_admin(target_tournament_id)
  order by teams.is_active desc, teams.group_name nulls last, teams.name;
$$;

grant execute on function public.get_admin_teams(uuid)
to authenticated;

create or replace function public.upsert_tournament_team(
  target_tournament_id uuid,
  target_team_id uuid,
  target_code text,
  target_name text,
  target_short_name text,
  target_tier integer,
  target_country_code text,
  target_group_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  clean_code text := upper(trim(target_code));
  clean_country_code text := upper(nullif(trim(target_country_code), ''));
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å endre lag.';
  end if;

  if clean_code = '' or trim(target_name) = '' then
    raise exception 'Lag og kode må fylles ut.';
  end if;

  if target_tier not between 1 and 4 then
    raise exception 'Tier må være mellom 1 og 4.';
  end if;

  if clean_country_code is not null and length(clean_country_code) <> 2 then
    raise exception 'Landskode må være to bokstaver, for eksempel NO.';
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
      is_active
    )
    values (
      target_tournament_id,
      clean_code,
      trim(target_name),
      nullif(trim(target_short_name), ''),
      target_tier,
      clean_country_code,
      nullif(trim(target_group_name), ''),
      true
    )
    returning id into saved_id;
  else
    update public.teams
    set
      code = clean_code,
      name = trim(target_name),
      short_name = nullif(trim(target_short_name), ''),
      tier = target_tier,
      country_code = clean_country_code,
      group_name = nullif(trim(target_group_name), '')
    where id = target_team_id
      and tournament_id = target_tournament_id
    returning id into saved_id;
  end if;

  return saved_id;
end;
$$;

grant execute on function public.upsert_tournament_team(
  uuid, uuid, text, text, text, integer, text, text
) to authenticated;

create or replace function public.set_tournament_team_active(
  target_tournament_id uuid,
  target_team_id uuid,
  target_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å endre lag.';
  end if;

  update public.teams
  set is_active = target_is_active
  where id = target_team_id
    and tournament_id = target_tournament_id;
end;
$$;

grant execute on function public.set_tournament_team_active(uuid, uuid, boolean)
to authenticated;

drop function if exists public.get_home_prize_pools(uuid);

create function public.get_home_prize_pools(target_tournament_id uuid)
returns table (
  pool_code text,
  pool_name text,
  minimum_tier integer,
  eligible_paid_players integer,
  bronze_players integer,
  silver_players integer,
  gold_players integer,
  prize_pool integer,
  first_prize integer,
  second_prize integer,
  third_prize integer
)
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select * from (
      values
        ('gold'::text, 'Gull'::text, 800, 300, 0.70::numeric, 0.30::numeric, 0::numeric),
        ('silver'::text, 'Sølv'::text, 500, 250, 0.60::numeric, 0.25::numeric, 0.15::numeric),
        ('bronze'::text, 'Bronse'::text, 250, 250, 0.50::numeric, 0.30::numeric, 0.20::numeric)
    ) as value(pool_code, pool_name, minimum_tier, contribution, first_pct, second_pct, third_pct)
  ),
  calculated as (
    select
      settings.*,
      count(members.player_id) filter (
        where members.payment_status = 'paid'
          and members.buy_in_tier >= settings.minimum_tier
      )::integer as eligible_paid_players,
      count(members.player_id) filter (
        where members.payment_status = 'paid'
          and members.buy_in_tier = 250
          and 250 >= settings.minimum_tier
      )::integer as bronze_players,
      count(members.player_id) filter (
        where members.payment_status = 'paid'
          and members.buy_in_tier = 500
          and 500 >= settings.minimum_tier
      )::integer as silver_players,
      count(members.player_id) filter (
        where members.payment_status = 'paid'
          and members.buy_in_tier = 800
          and 800 >= settings.minimum_tier
      )::integer as gold_players
    from settings
    left join public.tournament_members members
      on members.tournament_id = target_tournament_id
    group by
      settings.pool_code,
      settings.pool_name,
      settings.minimum_tier,
      settings.contribution,
      settings.first_pct,
      settings.second_pct,
      settings.third_pct
  )
  select
    calculated.pool_code,
    calculated.pool_name,
    calculated.minimum_tier,
    calculated.eligible_paid_players,
    calculated.bronze_players,
    calculated.silver_players,
    calculated.gold_players,
    (calculated.eligible_paid_players * calculated.contribution)::integer as prize_pool,
    round(calculated.eligible_paid_players * calculated.contribution * calculated.first_pct)::integer,
    round(calculated.eligible_paid_players * calculated.contribution * calculated.second_pct)::integer,
    round(calculated.eligible_paid_players * calculated.contribution * calculated.third_pct)::integer
  from calculated
  order by calculated.minimum_tier desc;
$$;

grant execute on function public.get_home_prize_pools(uuid)
to anon, authenticated;

create or replace function public.get_player_pool_status(
  target_tournament_id uuid,
  target_player_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'buy_in_tier', members.buy_in_tier,
    'is_paid', members.payment_status = 'paid',
    'eligible_pools',
      case
        when members.buy_in_tier >= 800 then array['bronze','silver','gold']
        when members.buy_in_tier >= 500 then array['bronze','silver']
        when members.buy_in_tier >= 250 then array['bronze']
        else array[]::text[]
      end
  )
  from public.tournament_members members
  where members.tournament_id = target_tournament_id
    and members.player_id = target_player_id
  limit 1;
$$;

grant execute on function public.get_player_pool_status(uuid, uuid)
to anon, authenticated;

commit;
notify pgrst, 'reload schema';
