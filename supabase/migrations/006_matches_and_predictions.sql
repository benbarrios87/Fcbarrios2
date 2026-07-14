begin;

create table if not exists public.tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  slug text not null,
  name text not null,
  stage text not null default 'group',
  display_order integer not null default 0,
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'locked', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, slug)
);

alter table public.matches
  add column if not exists round_id uuid
  references public.tournament_rounds(id) on delete set null;

create index if not exists tournament_rounds_tournament_order_idx
  on public.tournament_rounds (tournament_id, display_order);

create index if not exists matches_round_order_idx
  on public.matches (round_id, match_order);

alter table public.tournament_rounds enable row level security;

drop policy if exists "Public can read tournament rounds"
  on public.tournament_rounds;

create policy "Public can read tournament rounds"
on public.tournament_rounds for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage tournament rounds"
  on public.tournament_rounds;

create policy "Admins manage tournament rounds"
on public.tournament_rounds for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

create or replace function public.prediction_is_open(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    m.status = 'scheduled'
    and now() < coalesce(
      m.tipping_closes_at,
      r.closes_at,
      t.tips_deadline,
      m.kickoff_at
    )
    and coalesce(r.status, 'open') = 'open'
  from public.matches m
  join public.tournaments t on t.id = m.tournament_id
  left join public.tournament_rounds r on r.id = m.round_id
  where m.id = target_match_id;
$$;

grant execute on function public.prediction_is_open(uuid)
to anon, authenticated;

create or replace function public.get_my_predictions(
  target_tournament_id uuid
)
returns table (
  prediction_id uuid,
  match_id uuid,
  home_score integer,
  away_score integer,
  submitted_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.match_id,
    pr.home_score,
    pr.away_score,
    pr.submitted_at,
    pr.updated_at
  from public.predictions pr
  join public.players p on p.id = pr.player_id
  where pr.tournament_id = target_tournament_id
    and p.auth_user_id = auth.uid();
$$;

grant execute on function public.get_my_predictions(uuid)
to authenticated;

create or replace function public.save_prediction(
  target_match_id uuid,
  predicted_home_score integer,
  predicted_away_score integer
)
returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_match public.matches;
  target_player_id uuid;
  saved_prediction public.predictions;
begin
  if auth.uid() is null then
    raise exception 'Du må være logget inn.';
  end if;

  if predicted_home_score < 0 or predicted_away_score < 0 then
    raise exception 'Resultatet kan ikke være negativt.';
  end if;

  if predicted_home_score > 30 or predicted_away_score > 30 then
    raise exception 'Resultatet er utenfor tillatt område.';
  end if;

  select *
  into target_match
  from public.matches
  where id = target_match_id;

  if target_match.id is null then
    raise exception 'Kampen finnes ikke.';
  end if;

  if not public.prediction_is_open(target_match_id) then
    raise exception 'Tipsfristen er utløpt.';
  end if;

  select p.id
  into target_player_id
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;

  if target_player_id is null then
    raise exception 'Fant ingen spiller koblet til kontoen.';
  end if;

  if not exists (
    select 1
    from public.tournament_members tm
    where tm.tournament_id = target_match.tournament_id
      and tm.player_id = target_player_id
  ) then
    raise exception 'Du er ikke registrert i denne turneringen.';
  end if;

  insert into public.predictions (
    tournament_id,
    match_id,
    player_id,
    home_score,
    away_score,
    submitted_at,
    updated_at
  )
  values (
    target_match.tournament_id,
    target_match.id,
    target_player_id,
    predicted_home_score,
    predicted_away_score,
    now(),
    now()
  )
  on conflict (match_id, player_id)
  do update set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    updated_at = now()
  returning * into saved_prediction;

  return saved_prediction;
end;
$$;

grant execute on function public.save_prediction(uuid, integer, integer)
to authenticated;

with active_tournament as (
  select id
  from public.tournaments
  where slug = 'euro-2028'
  limit 1
)
insert into public.tournament_rounds (
  tournament_id,
  slug,
  name,
  stage,
  display_order,
  opens_at,
  closes_at,
  status
)
select
  id,
  'group-round-1',
  'Gruppespill · Runde 1',
  'group',
  1,
  '2028-05-20 09:00:00+02',
  '2028-06-09 20:45:00+02',
  'open'
from active_tournament
on conflict (tournament_id, slug) do update set
  name = excluded.name,
  stage = excluded.stage,
  display_order = excluded.display_order,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  status = excluded.status,
  updated_at = now();

with active_tournament as (
  select id
  from public.tournaments
  where slug = 'euro-2028'
  limit 1
),
active_round as (
  select r.id, r.tournament_id
  from public.tournament_rounds r
  join active_tournament t on t.id = r.tournament_id
  where r.slug = 'group-round-1'
)
insert into public.matches (
  tournament_id,
  round_id,
  external_id,
  round,
  stage_order,
  match_order,
  home_team,
  away_team,
  home_tier,
  away_tier,
  kickoff_at,
  tipping_opens_at,
  tipping_closes_at,
  status
)
select
  tournament_id,
  id,
  match_data.external_id,
  'Gruppespill · Runde 1',
  1,
  match_data.match_order,
  match_data.home_team,
  match_data.away_team,
  match_data.home_tier,
  match_data.away_tier,
  match_data.kickoff_at,
  '2028-05-20 09:00:00+02'::timestamptz,
  match_data.kickoff_at - interval '15 minutes',
  'scheduled'
from active_round
cross join (
  values
    ('euro28-001', 1, 'England', 'Italia', 1, 1, '2028-06-09 21:00:00+02'::timestamptz),
    ('euro28-002', 2, 'Norge', 'Nederland', 2, 1, '2028-06-10 18:00:00+02'::timestamptz),
    ('euro28-003', 3, 'Spania', 'Tyrkia', 1, 3, '2028-06-10 21:00:00+02'::timestamptz),
    ('euro28-004', 4, 'Danmark', 'Belgia', 2, 2, '2028-06-11 18:00:00+02'::timestamptz)
) as match_data(
  external_id,
  match_order,
  home_team,
  away_team,
  home_tier,
  away_tier,
  kickoff_at
)
on conflict (tournament_id, external_id) do update set
  round_id = excluded.round_id,
  round = excluded.round,
  stage_order = excluded.stage_order,
  match_order = excluded.match_order,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  home_tier = excluded.home_tier,
  away_tier = excluded.away_tier,
  kickoff_at = excluded.kickoff_at,
  tipping_opens_at = excluded.tipping_opens_at,
  tipping_closes_at = excluded.tipping_closes_at,
  status = excluded.status;

commit;
