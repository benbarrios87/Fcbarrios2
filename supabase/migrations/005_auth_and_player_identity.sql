-- FC Barrios 2.0
-- Migration 005: Auth, player identity and admin access
-- Run after migration 004.

begin;

create unique index if not exists players_email_unique_idx
  on public.players (lower(email))
  where email is not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_player_id uuid;
  active_tournament_id uuid;
  preferred_name text;
begin
  preferred_name :=
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  if preferred_name is null then
    preferred_name := split_part(new.email, '@', 1);
  end if;

  select p.id
  into linked_player_id
  from public.players p
  where lower(p.email) = lower(new.email)
  limit 1;

  if linked_player_id is null then
    insert into public.players (
      auth_user_id,
      display_name,
      email
    )
    values (
      new.id,
      preferred_name,
      lower(new.email)
    )
    returning id into linked_player_id;
  else
    update public.players
    set auth_user_id = new.id
    where id = linked_player_id
      and auth_user_id is null;
  end if;

  select t.id
  into active_tournament_id
  from public.tournaments t
  where t.slug = 'euro-2028'
  limit 1;

  if active_tournament_id is not null then
    insert into public.tournament_members (
      tournament_id,
      player_id,
      role
    )
    values (
      active_tournament_id,
      linked_player_id,
      'player'
    )
    on conflict (tournament_id, player_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.current_player()
returns table (
  player_id uuid,
  display_name text,
  email text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.email,
    p.avatar_url
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_tournament_membership(
  target_tournament_slug text
)
returns table (
  tournament_id uuid,
  tournament_slug text,
  player_id uuid,
  display_name text,
  role public.member_role
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.slug,
    p.id,
    p.display_name,
    tm.role
  from public.tournament_members tm
  join public.tournaments t on t.id = tm.tournament_id
  join public.players p on p.id = tm.player_id
  where t.slug = target_tournament_slug
    and p.auth_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_player() to authenticated;
grant execute on function public.current_tournament_membership(text) to authenticated;

drop policy if exists "Players can read own player record"
  on public.players;

create policy "Players can read own player record"
on public.players for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Players can update own player record"
  on public.players;

create policy "Players can update own player record"
on public.players for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists "Players can read own membership"
  on public.tournament_members;

create policy "Players can read own membership"
on public.tournament_members for select
to authenticated
using (
  exists (
    select 1
    from public.players p
    where p.id = tournament_members.player_id
      and p.auth_user_id = auth.uid()
  )
  or public.is_tournament_admin(tournament_id)
);

commit;

-- IMPORTANT: After Benjamin has logged in once, run this once to make him owner:
--
-- update public.tournament_members tm
-- set role = 'owner'
-- from public.players p, public.tournaments t
-- where tm.player_id = p.id
--   and tm.tournament_id = t.id
--   and lower(p.email) = lower('DIN_EPOST_HER')
--   and t.slug = 'euro-2028';
