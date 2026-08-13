-- FC Barrios 2.0
-- Migration 004: Historical tournaments and Hall of Fame (2016–2024)
-- Generated from the uploaded history sheet.
-- Safe to run more than once.

begin;

create table if not exists public.historical_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  final_rank integer not null check (final_rank > 0),
  field_size integer not null check (field_size > 0),
  correct_predictions integer check (correct_predictions >= 0),
  points numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, player_id),
  unique (tournament_id, final_rank)
);

create index if not exists historical_results_player_idx
  on public.historical_results (player_id);

create index if not exists historical_results_tournament_rank_idx
  on public.historical_results (tournament_id, final_rank);

insert into public.tournaments (
  slug,
  name,
  short_name,
  status,
  participant_count,
  settings
)
values
  ('euro-2016', 'EM 2016', 'EURO 2016', 'finished', 15, jsonb_build_object('competition_type', 'EM', 'history_year', 2016)),
  ('world-cup-2018', 'VM 2018', 'VM 2018', 'finished', 17, jsonb_build_object('competition_type', 'VM', 'history_year', 2018)),
  ('euro-2020', 'EM 2020', 'EURO 2020', 'finished', 21, jsonb_build_object('competition_type', 'EM', 'history_year', 2021)),
  ('world-cup-2022', 'VM 2022', 'VM 2022', 'finished', 14, jsonb_build_object('competition_type', 'VM', 'history_year', 2022)),
  ('euro-2024', 'EM 2024', 'EURO 2024', 'finished', 11, jsonb_build_object('competition_type', 'EM', 'history_year', 2024))
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  status = excluded.status,
  participant_count = excluded.participant_count,
  settings = public.tournaments.settings || excluded.settings,
  updated_at = now();

with incoming(display_name) as (
  values
    ('Alexander'),
    ('Anders Njåtun'),
    ('Anders Uldalen Brosstad'),
    ('Anders Ulvestad'),
    ('Andreas Stræte'),
    ('Benjamin Barrios'),
    ('Berntsen'),
    ('Edward Eikland'),
    ('Eirik'),
    ('Elias Barrios'),
    ('Espen'),
    ('Frederik Skoe'),
    ('Jannik Berg'),
    ('Kristoffer Eckhoff'),
    ('Kristoffer Merker'),
    ('Kristoffer O.'),
    ('Lars E'),
    ('Lars Haraldsen'),
    ('Marius Martinsen'),
    ('Martin Hildonen Marum'),
    ('Mathias'),
    ('Mattias Andersson'),
    ('Ole Andreas'),
    ('Silvia'),
    ('Sten'),
    ('Thommas'),
    ('Tommy'),
    ('Ørjan Knutsen'),
    ('Øyvind Refsnes')
)
insert into public.players (display_name)
select i.display_name
from incoming i
where not exists (
  select 1
  from public.players p
  where lower(trim(p.display_name)) = lower(trim(i.display_name))
);

with history_data (
  tournament_slug,
  player_name,
  final_rank,
  field_size,
  correct_predictions
) as (
  values
    ('euro-2016', 'Edward Eikland', 2, 15, 7),
    ('euro-2016', 'Andreas Stræte', 4, 15, 4),
    ('euro-2016', 'Marius Martinsen', 5, 15, 2),
    ('euro-2016', 'Benjamin Barrios', 6, 15, 2),
    ('euro-2016', 'Jannik Berg', 3, 15, 7),
    ('euro-2016', 'Ole Andreas', 7, 15, 4),
    ('euro-2016', 'Kristoffer Eckhoff', 1, 15, 4),
    ('euro-2016', 'Anders Ulvestad', 8, 15, 6),
    ('euro-2016', 'Silvia', 9, 15, 5),
    ('euro-2016', 'Lars Haraldsen', 10, 15, 4),
    ('euro-2016', 'Kristoffer O.', 11, 15, 3),
    ('euro-2016', 'Frederik Skoe', 12, 15, 8),
    ('euro-2016', 'Eirik', 13, 15, 3),
    ('euro-2016', 'Anders Uldalen Brosstad', 14, 15, 5),
    ('euro-2016', 'Kristoffer Merker', 15, 15, 2),
    ('world-cup-2018', 'Ørjan Knutsen', 1, 17, null),
    ('world-cup-2018', 'Marius Martinsen', 2, 17, null),
    ('world-cup-2018', 'Lars Haraldsen', 3, 17, null),
    ('world-cup-2018', 'Andreas Stræte', 4, 17, null),
    ('world-cup-2018', 'Eirik', 5, 17, null),
    ('world-cup-2018', 'Frederik Skoe', 6, 17, null),
    ('world-cup-2018', 'Jannik Berg', 7, 17, null),
    ('world-cup-2018', 'Ole Andreas', 8, 17, null),
    ('world-cup-2018', 'Lars E', 9, 17, null),
    ('world-cup-2018', 'Anders Njåtun', 10, 17, null),
    ('world-cup-2018', 'Øyvind Refsnes', 11, 17, null),
    ('world-cup-2018', 'Thommas', 12, 17, null),
    ('world-cup-2018', 'Anders Uldalen Brosstad', 13, 17, null),
    ('world-cup-2018', 'Edward Eikland', 14, 17, null),
    ('world-cup-2018', 'Mattias Andersson', 15, 17, null),
    ('world-cup-2018', 'Benjamin Barrios', 16, 17, null),
    ('world-cup-2018', 'Kristoffer Merker', 17, 17, null),
    ('euro-2020', 'Edward Eikland', 1, 21, 7),
    ('euro-2020', 'Mattias Andersson', 2, 21, 3),
    ('euro-2020', 'Alexander', 3, 21, 8),
    ('euro-2020', 'Berntsen', 4, 21, 7),
    ('euro-2020', 'Lars Haraldsen', 5, 21, 6),
    ('euro-2020', 'Martin Hildonen Marum', 6, 21, 4),
    ('euro-2020', 'Anders Ulvestad', 7, 21, 5),
    ('euro-2020', 'Mathias', 8, 21, 5),
    ('euro-2020', 'Sten', 9, 21, 1),
    ('euro-2020', 'Tommy', 10, 21, 5),
    ('euro-2020', 'Ørjan Knutsen', 11, 21, 5),
    ('euro-2020', 'Anders Uldalen Brosstad', 12, 21, 6),
    ('euro-2020', 'Espen', 13, 21, 5),
    ('euro-2020', 'Marius Martinsen', 14, 21, 4),
    ('euro-2020', 'Benjamin Barrios', 15, 21, 3),
    ('euro-2020', 'Jannik Berg', 16, 21, 5),
    ('euro-2020', 'Andreas Stræte', 17, 21, 2),
    ('euro-2020', 'Ole Andreas', 18, 21, 3),
    ('euro-2020', 'Kristoffer Merker', 19, 21, 2),
    ('euro-2020', 'Silvia', 20, 21, 4),
    ('euro-2020', 'Øyvind Refsnes', 21, 21, 2),
    ('world-cup-2022', 'Mattias Andersson', 1, 14, 10),
    ('world-cup-2022', 'Edward Eikland', 2, 14, 6),
    ('world-cup-2022', 'Andreas Stræte', 3, 14, 8),
    ('world-cup-2022', 'Marius Martinsen', 4, 14, 9),
    ('world-cup-2022', 'Martin Hildonen Marum', 5, 14, 6),
    ('world-cup-2022', 'Benjamin Barrios', 6, 14, 4),
    ('world-cup-2022', 'Lars Haraldsen', 7, 14, 8),
    ('world-cup-2022', 'Ørjan Knutsen', 8, 14, 8),
    ('world-cup-2022', 'Jannik Berg', 9, 14, 7),
    ('world-cup-2022', 'Anders Uldalen Brosstad', 10, 14, 6),
    ('world-cup-2022', 'Anders Ulvestad', 11, 14, 8),
    ('world-cup-2022', 'Kristoffer Merker', 12, 14, 4),
    ('world-cup-2022', 'Øyvind Refsnes', 13, 14, 4),
    ('world-cup-2022', 'Ole Andreas', 14, 14, 0),
    ('euro-2024', 'Lars Haraldsen', 1, 11, 11),
    ('euro-2024', 'Andreas Stræte', 2, 11, 7),
    ('euro-2024', 'Anders Uldalen Brosstad', 3, 11, 4),
    ('euro-2024', 'Ørjan Knutsen', 4, 11, 8),
    ('euro-2024', 'Øyvind Refsnes', 5, 11, 6),
    ('euro-2024', 'Jannik Berg', 6, 11, 5),
    ('euro-2024', 'Benjamin Barrios', 7, 11, 5),
    ('euro-2024', 'Edward Eikland', 8, 11, 4),
    ('euro-2024', 'Kristoffer Merker', 9, 11, 4),
    ('euro-2024', 'Martin Hildonen Marum', 10, 11, 4),
    ('euro-2024', 'Elias Barrios', 11, 11, 5)
)
insert into public.historical_results (
  tournament_id,
  player_id,
  final_rank,
  field_size,
  correct_predictions
)
select
  t.id,
  p.id,
  h.final_rank,
  h.field_size,
  h.correct_predictions
from history_data h
join public.tournaments t
  on t.slug = h.tournament_slug
join lateral (
  select p2.id
  from public.players p2
  where lower(trim(p2.display_name)) = lower(trim(h.player_name))
  order by p2.created_at, p2.id
  limit 1
) p on true
on conflict (tournament_id, player_id) do update set
  final_rank = excluded.final_rank,
  field_size = excluded.field_size,
  correct_predictions = excluded.correct_predictions,
  updated_at = now();

create or replace view public.hall_of_fame_view as
select
  p.id as player_id,
  p.display_name as name,
  count(*)::integer as tournaments_played,
  count(*) filter (where hr.final_rank = 1)::integer as titles,
  count(*) filter (where hr.final_rank <= 3)::integer as podiums,
  min(hr.final_rank)::integer as best_finish,
  round(avg(hr.final_rank)::numeric, 2) as average_finish,
  sum(coalesce(hr.correct_predictions, 0))::integer as total_correct_predictions,
  round(
    avg(
      case
        when hr.field_size > 1
        then 100.0 * (hr.field_size - hr.final_rank) / (hr.field_size - 1)
        else 100
      end
    )::numeric,
    2
  ) as average_percentile
from public.historical_results hr
join public.players p on p.id = hr.player_id
group by p.id, p.display_name;

create or replace view public.career_history_view as
select
  hr.id,
  hr.player_id,
  p.display_name as player_name,
  hr.tournament_id,
  t.slug as tournament_slug,
  t.name as tournament_name,
  (t.settings ->> 'history_year')::integer as year,
  t.settings ->> 'competition_type' as competition_type,
  hr.final_rank,
  hr.field_size,
  hr.correct_predictions,
  hr.points,
  (hr.final_rank = 1) as is_champion,
  case
    when hr.field_size > 1
    then round(
      (100.0 * (hr.field_size - hr.final_rank) / (hr.field_size - 1))::numeric,
      2
    )
    else 100
  end as percentile
from public.historical_results hr
join public.players p on p.id = hr.player_id
join public.tournaments t on t.id = hr.tournament_id;

alter table public.historical_results enable row level security;

drop policy if exists "Public can read historical results"
  on public.historical_results;

create policy "Public can read historical results"
on public.historical_results for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage historical results"
  on public.historical_results;

create policy "Admins manage historical results"
on public.historical_results for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

do $$
declare
  imported_count integer;
begin
  select count(*) into imported_count
  from public.historical_results hr
  join public.tournaments t on t.id = hr.tournament_id
  where t.slug in (
    'euro-2016',
    'world-cup-2018',
    'euro-2020',
    'world-cup-2022',
    'euro-2024'
  );

  if imported_count <> 78 then
    raise exception
      'Historikkimporten inneholder % rader, forventet 78.',
      imported_count;
  end if;
end
$$;

commit;
