-- FC Barrios 2.0
-- Migration 012: Configurable bonus engine
-- Top scorer, best player, RTG, qualifiers and goal-rich/goal-poor matches.
-- Run after migration 011.

begin;

create table if not exists public.bonus_games (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null,
  name text not null,
  game_type text not null check (
    game_type in (
      'allocation',
      'qualifier_pick',
      'match_pick'
    )
  ),
  total_budget numeric(10,2) not null default 0 check (total_budget >= 0),
  max_per_candidate numeric(10,2) check (max_per_candidate is null or max_per_candidate >= 0),
  max_selections integer check (max_selections is null or max_selections >= 0),
  required_selections integer check (required_selections is null or required_selections >= 0),
  base_points numeric(10,2) not null default 1 check (base_points >= 0),
  threshold_value numeric(10,2),
  deadline timestamptz,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, code)
);

create table if not exists public.bonus_candidates (
  id uuid primary key default gen_random_uuid(),
  bonus_game_id uuid not null references public.bonus_games(id) on delete cascade,
  candidate_type text not null check (
    candidate_type in ('player', 'team', 'match')
  ),
  reference_id uuid,
  label text not null,
  tier integer,
  multiplier numeric(10,3) not null default 1 check (multiplier >= 0),
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  unique (bonus_game_id, candidate_type, label)
);

create table if not exists public.bonus_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bonus_game_id uuid not null references public.bonus_games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  candidate_id uuid not null references public.bonus_candidates(id) on delete cascade,
  stake numeric(10,2) not null default 0 check (stake >= 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bonus_game_id, player_id, candidate_id)
);

create table if not exists public.bonus_results (
  id uuid primary key default gen_random_uuid(),
  bonus_game_id uuid not null references public.bonus_games(id) on delete cascade,
  candidate_id uuid not null references public.bonus_candidates(id) on delete cascade,
  is_winner boolean not null default false,
  result_value numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz not null default now(),
  unique (bonus_game_id, candidate_id)
);

create table if not exists public.bonus_scores (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bonus_game_id uuid not null references public.bonus_games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points numeric(10,2) not null default 0,
  calculated_at timestamptz not null default now(),
  breakdown jsonb not null default '{}'::jsonb,
  unique (bonus_game_id, player_id)
);

create index if not exists bonus_games_tournament_idx
  on public.bonus_games (tournament_id, is_active);

create index if not exists bonus_entries_player_idx
  on public.bonus_entries (tournament_id, player_id);

create index if not exists bonus_scores_player_idx
  on public.bonus_scores (tournament_id, player_id);

alter table public.bonus_games enable row level security;
alter table public.bonus_candidates enable row level security;
alter table public.bonus_entries enable row level security;
alter table public.bonus_results enable row level security;
alter table public.bonus_scores enable row level security;

drop policy if exists "Public can read active bonus games"
  on public.bonus_games;

create policy "Public can read active bonus games"
on public.bonus_games for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active bonus candidates"
  on public.bonus_candidates;

create policy "Public can read active bonus candidates"
on public.bonus_candidates for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Players can read own bonus entries"
  on public.bonus_entries;

create policy "Players can read own bonus entries"
on public.bonus_entries for select
to authenticated
using (
  exists (
    select 1
    from public.players p
    where p.id = bonus_entries.player_id
      and p.auth_user_id = auth.uid()
  )
  or public.is_tournament_admin(tournament_id)
);

drop policy if exists "Authenticated users can read bonus scores"
  on public.bonus_scores;

create policy "Authenticated users can read bonus scores"
on public.bonus_scores for select
to authenticated
using (true);

drop policy if exists "Admins manage bonus games"
  on public.bonus_games;

create policy "Admins manage bonus games"
on public.bonus_games for all
to authenticated
using (public.is_tournament_admin(tournament_id))
with check (public.is_tournament_admin(tournament_id));

drop policy if exists "Admins manage bonus candidates"
  on public.bonus_candidates;

create policy "Admins manage bonus candidates"
on public.bonus_candidates for all
to authenticated
using (
  exists (
    select 1
    from public.bonus_games bg
    where bg.id = bonus_candidates.bonus_game_id
      and public.is_tournament_admin(bg.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.bonus_games bg
    where bg.id = bonus_candidates.bonus_game_id
      and public.is_tournament_admin(bg.tournament_id)
  )
);

drop policy if exists "Admins manage bonus results"
  on public.bonus_results;

create policy "Admins manage bonus results"
on public.bonus_results for all
to authenticated
using (
  exists (
    select 1
    from public.bonus_games bg
    where bg.id = bonus_results.bonus_game_id
      and public.is_tournament_admin(bg.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.bonus_games bg
    where bg.id = bonus_results.bonus_game_id
      and public.is_tournament_admin(bg.tournament_id)
  )
);

create or replace function public.save_bonus_entries(
  target_bonus_game_id uuid,
  entries_json jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_game public.bonus_games;
  target_player_id uuid;
  total_stake numeric(10,2);
  selected_count integer;
  saved_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Du må være logget inn.';
  end if;

  select *
  into target_game
  from public.bonus_games
  where id = target_bonus_game_id
    and is_active = true;

  if target_game.id is null then
    raise exception 'Bonusspillet finnes ikke.';
  end if;

  if target_game.deadline is not null and now() >= target_game.deadline then
    raise exception 'Fristen for bonusspillet er utløpt.';
  end if;

  select p.id
  into target_player_id
  from public.players p
  where p.auth_user_id = auth.uid()
  limit 1;

  if target_player_id is null then
    raise exception 'Fant ingen spiller koblet til kontoen.';
  end if;

  select
    coalesce(sum(entry.stake), 0),
    count(*) filter (where entry.stake > 0)
  into total_stake, selected_count
  from jsonb_to_recordset(entries_json) as entry(
    candidate_id uuid,
    stake numeric
  );

  if target_game.game_type = 'allocation' then
    if total_stake > target_game.total_budget then
      raise exception 'Du har fordelt flere poeng enn tillatt.';
    end if;

    if target_game.max_selections is not null
       and selected_count > target_game.max_selections then
      raise exception 'Du har valgt for mange kandidater.';
    end if;

    if exists (
      select 1
      from jsonb_to_recordset(entries_json) as entry(
        candidate_id uuid,
        stake numeric
      )
      where target_game.max_per_candidate is not null
        and entry.stake > target_game.max_per_candidate
    ) then
      raise exception 'En kandidat har fått mer enn maks innsats.';
    end if;
  else
    if target_game.required_selections is not null
       and selected_count <> target_game.required_selections then
      raise exception 'Du må velge nøyaktig % kandidater.',
        target_game.required_selections;
    end if;
  end if;

  delete from public.bonus_entries
  where bonus_game_id = target_bonus_game_id
    and player_id = target_player_id;

  insert into public.bonus_entries (
    tournament_id,
    bonus_game_id,
    player_id,
    candidate_id,
    stake,
    submitted_at,
    updated_at
  )
  select
    target_game.tournament_id,
    target_game.id,
    target_player_id,
    entry.candidate_id,
    entry.stake,
    now(),
    now()
  from jsonb_to_recordset(entries_json) as entry(
    candidate_id uuid,
    stake numeric
  )
  join public.bonus_candidates bc
    on bc.id = entry.candidate_id
   and bc.bonus_game_id = target_game.id
  where entry.stake > 0;

  get diagnostics saved_count = row_count;
  return saved_count;
end;
$$;

grant execute on function public.save_bonus_entries(uuid, jsonb)
to authenticated;

create or replace function public.get_my_bonus_entries(
  target_tournament_id uuid
)
returns table (
  bonus_game_id uuid,
  candidate_id uuid,
  stake numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    be.bonus_game_id,
    be.candidate_id,
    be.stake
  from public.bonus_entries be
  join public.players p on p.id = be.player_id
  where be.tournament_id = target_tournament_id
    and p.auth_user_id = auth.uid();
$$;

grant execute on function public.get_my_bonus_entries(uuid)
to authenticated;

create or replace function public.score_bonus_game(
  target_bonus_game_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_game public.bonus_games;
  player_record record;
  calculated_points numeric(10,2);
  detail jsonb;
  processed_count integer := 0;
begin
  select *
  into target_game
  from public.bonus_games
  where id = target_bonus_game_id;

  if target_game.id is null then
    raise exception 'Bonusspillet finnes ikke.';
  end if;

  if not public.is_tournament_admin(target_game.tournament_id) then
    raise exception 'Du har ikke tilgang til å beregne bonuspoeng.';
  end if;

  for player_record in
    select distinct be.player_id
    from public.bonus_entries be
    where be.bonus_game_id = target_bonus_game_id
  loop
    select
      coalesce(sum(
        case
          when br.is_winner then
            case
              when target_game.game_type = 'allocation'
                then be.stake * bc.multiplier
              else target_game.base_points
            end
          else 0
        end
      ), 0),
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'candidate', bc.label,
            'stake', be.stake,
            'multiplier', bc.multiplier,
            'winner', coalesce(br.is_winner, false),
            'points',
              case
                when br.is_winner then
                  case
                    when target_game.game_type = 'allocation'
                      then be.stake * bc.multiplier
                    else target_game.base_points
                  end
                else 0
              end
          )
          order by bc.display_order, bc.label
        ),
        '[]'::jsonb
      )
    into calculated_points, detail
    from public.bonus_entries be
    join public.bonus_candidates bc
      on bc.id = be.candidate_id
    left join public.bonus_results br
      on br.bonus_game_id = be.bonus_game_id
     and br.candidate_id = be.candidate_id
    where be.bonus_game_id = target_bonus_game_id
      and be.player_id = player_record.player_id;

    insert into public.bonus_scores (
      tournament_id,
      bonus_game_id,
      player_id,
      points,
      calculated_at,
      breakdown
    )
    values (
      target_game.tournament_id,
      target_game.id,
      player_record.player_id,
      calculated_points,
      now(),
      detail
    )
    on conflict (bonus_game_id, player_id)
    do update set
      points = excluded.points,
      calculated_at = now(),
      breakdown = excluded.breakdown;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

grant execute on function public.score_bonus_game(uuid)
to authenticated;

create or replace view public.player_total_points_view as
select
  tm.tournament_id,
  tm.player_id,
  coalesce(match_points.points, 0)::numeric(10,2) as match_points,
  coalesce(bonus_points.points, 0)::numeric(10,2) as bonus_points,
  (
    coalesce(match_points.points, 0) +
    coalesce(bonus_points.points, 0)
  )::numeric(10,2) as total_points
from public.tournament_members tm
left join (
  select
    tournament_id,
    player_id,
    sum(points) as points
  from public.prediction_scores
  group by tournament_id, player_id
) match_points
  on match_points.tournament_id = tm.tournament_id
 and match_points.player_id = tm.player_id
left join (
  select
    tournament_id,
    player_id,
    sum(points) as points
  from public.bonus_scores
  group by tournament_id, player_id
) bonus_points
  on bonus_points.tournament_id = tm.tournament_id
 and bonus_points.player_id = tm.player_id;

create or replace view public.leaderboard_view as
select
  tm.tournament_id,
  p.id,
  p.display_name as name,
  p.avatar_url,
  coalesce(ptp.total_points, 0)::numeric(10,2) as points,
  coalesce(ptp.match_points, 0)::numeric(10,2) as match_points,
  coalesce(ptp.bonus_points, 0)::numeric(10,2) as bonus_points,
  count(ps.*) filter (where ps.score_type = 'exact')::integer as exact_hits,
  count(ps.*) filter (where ps.score_type = 'difference')::integer as difference_hits,
  count(ps.*) filter (where ps.score_type = 'outcome')::integer as outcome_hits,
  row_number() over (
    partition by tm.tournament_id
    order by
      coalesce(ptp.total_points, 0) desc,
      count(ps.*) filter (where ps.score_type = 'exact') desc,
      p.display_name
  )::integer as rank,
  coalesce((
    select sum(last_scores.points)
    from (
      select ps2.points
      from public.prediction_scores ps2
      join public.predictions pr2 on pr2.id = ps2.prediction_id
      join public.matches m2 on m2.id = pr2.match_id
      where ps2.tournament_id = tm.tournament_id
        and ps2.player_id = tm.player_id
      order by m2.kickoff_at desc nulls last
      limit 5
    ) last_scores
  ), 0)::numeric(10,2) as form_points,
  0::integer as movement
from public.tournament_members tm
join public.players p on p.id = tm.player_id
left join public.player_total_points_view ptp
  on ptp.tournament_id = tm.tournament_id
 and ptp.player_id = tm.player_id
left join public.prediction_scores ps
  on ps.tournament_id = tm.tournament_id
 and ps.player_id = tm.player_id
group by
  tm.tournament_id,
  tm.player_id,
  p.id,
  p.display_name,
  p.avatar_url,
  ptp.total_points,
  ptp.match_points,
  ptp.bonus_points;

with tournament_target as (
  select id
  from public.tournaments
  where slug = 'euro-2028'
  limit 1
)
insert into public.bonus_games (
  tournament_id,
  code,
  name,
  game_type,
  total_budget,
  max_per_candidate,
  max_selections,
  required_selections,
  base_points,
  threshold_value,
  deadline,
  settings
)
select
  id,
  game.code,
  game.name,
  game.game_type,
  game.total_budget,
  game.max_per_candidate,
  game.max_selections,
  game.required_selections,
  game.base_points,
  game.threshold_value,
  '2028-06-09 17:45:00+02'::timestamptz,
  game.settings
from tournament_target
cross join (
  values
    (
      'top-scorer',
      'Toppscorer',
      'allocation',
      5::numeric,
      5::numeric,
      5,
      null::integer,
      0::numeric,
      null::numeric,
      jsonb_build_object('description', 'Fordel poeng på toppscorer-kandidater')
    ),
    (
      'best-player',
      'Best Player',
      'allocation',
      5::numeric,
      5::numeric,
      5,
      null::integer,
      0::numeric,
      null::numeric,
      jsonb_build_object('description', 'Fordel poeng på turneringens beste spiller')
    ),
    (
      'rtg',
      'Road to Glory',
      'allocation',
      10::numeric,
      5::numeric,
      10,
      null::integer,
      0::numeric,
      null::numeric,
      jsonb_build_object('description', 'Fordel RTG-poengene på lag')
    ),
    (
      'qualifiers',
      'Sluttspillag per tier',
      'qualifier_pick',
      0::numeric,
      null::numeric,
      5,
      5,
      1::numeric,
      null::numeric,
      jsonb_build_object('one_per_tier', true)
    ),
    (
      'goal-rich',
      'Målrike kamper',
      'match_pick',
      0::numeric,
      null::numeric,
      5,
      5,
      1::numeric,
      4::numeric,
      jsonb_build_object('comparison', 'gte', 'metric', 'total_goals')
    ),
    (
      'goal-poor',
      'Målfattige kamper',
      'match_pick',
      0::numeric,
      null::numeric,
      5,
      5,
      1::numeric,
      1::numeric,
      jsonb_build_object('comparison', 'lte', 'metric', 'total_goals')
    )
) as game(
  code,
  name,
  game_type,
  total_budget,
  max_per_candidate,
  max_selections,
  required_selections,
  base_points,
  threshold_value,
  settings
)
on conflict (tournament_id, code) do update set
  name = excluded.name,
  game_type = excluded.game_type,
  total_budget = excluded.total_budget,
  max_per_candidate = excluded.max_per_candidate,
  max_selections = excluded.max_selections,
  required_selections = excluded.required_selections,
  base_points = excluded.base_points,
  threshold_value = excluded.threshold_value,
  settings = excluded.settings,
  updated_at = now();

commit;

notify pgrst, 'reload schema';
