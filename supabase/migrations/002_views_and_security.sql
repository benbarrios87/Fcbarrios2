create or replace function public.is_tournament_admin(target_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_members tm
    join public.players p on p.id = tm.player_id
    where tm.tournament_id = target_tournament_id
      and p.auth_user_id = auth.uid()
      and tm.role in ('admin', 'owner')
  );
$$;

create or replace view public.leaderboard_view as
select
  tm.tournament_id,
  p.id,
  p.display_name as name,
  p.avatar_url,
  coalesce(sum(ps.points), 0)::numeric(10,2) as points,
  count(*) filter (where ps.score_type = 'exact')::integer as exact_hits,
  row_number() over (
    partition by tm.tournament_id
    order by coalesce(sum(ps.points), 0) desc, p.display_name
  )::integer as rank,
  0::numeric as form_points,
  0::integer as movement
from public.tournament_members tm
join public.players p on p.id = tm.player_id
left join public.prediction_scores ps
  on ps.tournament_id = tm.tournament_id
 and ps.player_id = tm.player_id
group by tm.tournament_id, p.id, p.display_name, p.avatar_url;

alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.tournament_members enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.score_rules enable row level security;
alter table public.prediction_scores enable row level security;
alter table public.announcements enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.rtg_entries enable row level security;

create policy "Public can read tournaments"
on public.tournaments for select
to anon, authenticated
using (status <> 'archived');

create policy "Public can read teams"
on public.teams for select
to anon, authenticated
using (true);

create policy "Public can read matches"
on public.matches for select
to anon, authenticated
using (true);

create policy "Public can read published announcements"
on public.announcements for select
to anon, authenticated
using (is_published = true);

create policy "Public can read achievements"
on public.achievements for select
to anon, authenticated
using (true);

create policy "Authenticated users can read players"
on public.players for select
to authenticated
using (true);

create policy "Authenticated users can read memberships"
on public.tournament_members for select
to authenticated
using (true);

create policy "Players can read own predictions after auth"
on public.predictions for select
to authenticated
using (
  exists (
    select 1 from public.players p
    where p.id = predictions.player_id
      and p.auth_user_id = auth.uid()
  )
  or public.is_tournament_admin(tournament_id)
);

create policy "Players can insert own predictions"
on public.predictions for insert
to authenticated
with check (
  exists (
    select 1 from public.players p
    where p.id = predictions.player_id
      and p.auth_user_id = auth.uid()
  )
  and now() < (
    select coalesce(m.tipping_closes_at, t.tips_deadline)
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.id = predictions.match_id
  )
);

create policy "Players can update own open predictions"
on public.predictions for update
to authenticated
using (
  exists (
    select 1 from public.players p
    where p.id = predictions.player_id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  now() < (
    select coalesce(m.tipping_closes_at, t.tips_deadline)
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.id = predictions.match_id
  )
);

create policy "Authenticated users can read scores"
on public.prediction_scores for select
to authenticated
using (true);

create policy "Authenticated users can read player achievements"
on public.player_achievements for select
to authenticated
using (true);

create policy "Players can read own RTG entries"
on public.rtg_entries for select
to authenticated
using (
  exists (
    select 1 from public.players p
    where p.id = rtg_entries.player_id
      and p.auth_user_id = auth.uid()
  )
  or public.is_tournament_admin(tournament_id)
);

create policy "Admins manage tournaments"
on public.tournaments for all
to authenticated
using (public.is_tournament_admin(id))
with check (public.is_tournament_admin(id));

create policy "Admins manage matches"
on public.matches for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

create policy "Admins manage announcements"
on public.announcements for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

create policy "Admins manage scoring rules"
on public.score_rules for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));
