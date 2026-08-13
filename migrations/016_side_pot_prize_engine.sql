begin;

update public.tournaments
set buy_in_options = array[250,500,800]
where buy_in_options is distinct from array[250,500,800];

create table if not exists public.prize_pool_settings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  pool_code text not null check (pool_code in ('bronze','silver','gold')),
  pool_name text not null,
  minimum_tier integer not null check (minimum_tier in (250,500,800)),
  contribution_per_player integer not null check (contribution_per_player >= 0),
  distribution numeric[] not null default array[60,25,15]::numeric[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id,pool_code)
);

alter table public.prize_pool_settings enable row level security;

drop policy if exists "Prize settings are public" on public.prize_pool_settings;
create policy "Prize settings are public"
on public.prize_pool_settings for select
to anon,authenticated
using (true);

drop policy if exists "Admins manage prize settings" on public.prize_pool_settings;
create policy "Admins manage prize settings"
on public.prize_pool_settings for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

insert into public.prize_pool_settings (
  tournament_id,pool_code,pool_name,minimum_tier,
  contribution_per_player,distribution
)
select
  t.id,
  seed.pool_code,
  seed.pool_name,
  seed.minimum_tier,
  seed.contribution_per_player,
  seed.distribution
from public.tournaments t
cross join (
  values
    ('bronze','Bronse',250,250,array[50,30,20]::numeric[]),
    ('silver','Sølv',500,250,array[60,25,15]::numeric[]),
    ('gold','Gull',800,300,array[70,30]::numeric[])
) as seed(pool_code,pool_name,minimum_tier,contribution_per_player,distribution)
on conflict (tournament_id,pool_code)
do update set
  pool_name = excluded.pool_name,
  minimum_tier = excluded.minimum_tier,
  contribution_per_player = excluded.contribution_per_player,
  updated_at = now();

create or replace function public.update_prize_pool_settings(
  target_tournament_id uuid,
  target_pool_code text,
  target_distribution numeric[],
  target_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  total_percent numeric;
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å endre premieoppsettet.';
  end if;

  if target_pool_code not in ('bronze','silver','gold') then
    raise exception 'Ugyldig premiepott.';
  end if;

  if cardinality(target_distribution) < 1 then
    raise exception 'Premiefordelingen må ha minst én plass.';
  end if;

  select coalesce(sum(value),0)
  into total_percent
  from unnest(target_distribution) as value;

  if total_percent <> 100 then
    raise exception 'Premiefordelingen må bli nøyaktig 100 prosent.';
  end if;

  if exists(select 1 from unnest(target_distribution) value where value < 0) then
    raise exception 'Premieprosent kan ikke være negativ.';
  end if;

  update public.prize_pool_settings
  set distribution=target_distribution,
      is_active=target_is_active,
      updated_at=now()
  where tournament_id=target_tournament_id
    and pool_code=target_pool_code;
end;
$$;

grant execute on function public.update_prize_pool_settings(uuid,text,numeric[],boolean)
to authenticated;

create or replace function public.get_side_pot_overview(target_tournament_id uuid)
returns table(
  pool_code text,
  pool_name text,
  minimum_tier integer,
  contribution_per_player integer,
  eligible_paid_players integer,
  prize_pool integer,
  distribution numeric[],
  is_active boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select
    settings.pool_code,
    settings.pool_name,
    settings.minimum_tier,
    settings.contribution_per_player,
    count(members.player_id)::integer,
    (count(members.player_id) * settings.contribution_per_player)::integer,
    settings.distribution,
    settings.is_active
  from public.prize_pool_settings settings
  left join public.tournament_members members
    on members.tournament_id=settings.tournament_id
   and members.payment_status='paid'
   and members.buy_in_tier >= settings.minimum_tier
  where settings.tournament_id=target_tournament_id
  group by
    settings.pool_code,settings.pool_name,settings.minimum_tier,
    settings.contribution_per_player,settings.distribution,settings.is_active
  order by settings.minimum_tier desc;
$$;

grant execute on function public.get_side_pot_overview(uuid)
to anon,authenticated;

create or replace function public.calculate_side_pot_winners(target_tournament_id uuid)
returns table(
  pool_code text,
  pool_name text,
  prize_place integer,
  player_id uuid,
  display_name text,
  avatar_url text,
  leaderboard_rank integer,
  player_tier integer,
  prize_amount integer,
  prize_percent numeric
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  pool record;
  prize_index integer;
  prize_pct numeric;
  selected_player record;
begin
  for pool in
    select *
    from public.get_side_pot_overview(target_tournament_id)
    where is_active=true
    order by minimum_tier desc
  loop
    prize_index := 0;

    foreach prize_pct in array pool.distribution
    loop
      prize_index := prize_index + 1;

      select
        leaderboard.id as player_id,
        leaderboard.name as display_name,
        leaderboard.avatar_url,
        leaderboard.rank::integer as leaderboard_rank,
        members.buy_in_tier
      into selected_player
      from public.leaderboard_view leaderboard
      join public.tournament_members members
        on members.tournament_id=leaderboard.tournament_id
       and members.player_id=leaderboard.id
      where leaderboard.tournament_id=target_tournament_id
        and members.payment_status='paid'
        and members.buy_in_tier >= pool.minimum_tier
      order by leaderboard.rank,leaderboard.name
      offset prize_index - 1
      limit 1;

      if selected_player.player_id is null then
        exit;
      end if;

      pool_code := pool.pool_code;
      pool_name := pool.pool_name;
      prize_place := prize_index;
      player_id := selected_player.player_id;
      display_name := selected_player.display_name;
      avatar_url := selected_player.avatar_url;
      leaderboard_rank := selected_player.leaderboard_rank;
      player_tier := selected_player.buy_in_tier;
      prize_amount := round(pool.prize_pool * prize_pct / 100.0)::integer;
      prize_percent := prize_pct;
      return next;
    end loop;
  end loop;
end;
$$;

grant execute on function public.calculate_side_pot_winners(uuid)
to anon,authenticated;

create or replace function public.get_leaderboard_with_buy_in(target_tournament_id uuid)
returns table(
  tournament_id uuid,
  id uuid,
  name text,
  avatar_url text,
  points numeric,
  match_points numeric,
  bonus_points numeric,
  exact_hits integer,
  difference_hits integer,
  outcome_hits integer,
  rank integer,
  form_points numeric,
  movement integer,
  buy_in_tier integer,
  is_paid boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select
    leaderboard.tournament_id,
    leaderboard.id,
    leaderboard.name,
    leaderboard.avatar_url,
    leaderboard.points,
    leaderboard.match_points,
    leaderboard.bonus_points,
    leaderboard.exact_hits,
    leaderboard.difference_hits,
    leaderboard.outcome_hits,
    leaderboard.rank,
    leaderboard.form_points,
    leaderboard.movement,
    members.buy_in_tier,
    members.payment_status='paid'
  from public.leaderboard_view leaderboard
  join public.tournament_members members
    on members.tournament_id=leaderboard.tournament_id
   and members.player_id=leaderboard.id
  where leaderboard.tournament_id=target_tournament_id
  order by leaderboard.rank;
$$;

grant execute on function public.get_leaderboard_with_buy_in(uuid)
to anon,authenticated;

commit;
notify pgrst,'reload schema';
