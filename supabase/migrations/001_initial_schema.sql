create extension if not exists "pgcrypto";

create type public.tournament_status as enum (
  'planning',
  'registration',
  'tipping',
  'live',
  'finished',
  'archived'
);

create type public.member_role as enum ('player', 'admin', 'owner');

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  status public.tournament_status not null default 'planning',
  host_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  tips_deadline timestamptz,
  buy_in integer not null default 0 check (buy_in >= 0),
  participant_count integer not null default 0 check (participant_count >= 0),
  prize_pool integer not null default 0 check (prize_pool >= 0),
  settings jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  phone text,
  email text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tournament_members (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  role public.member_role not null default 'player',
  joined_at timestamptz not null default now(),
  primary key (tournament_id, player_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null,
  name text not null,
  short_name text,
  tier smallint not null default 4 check (tier between 1 and 4),
  flag_url text,
  group_name text,
  unique (tournament_id, code)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  external_id text,
  round text not null,
  stage_order integer not null default 0,
  match_order integer not null default 0,
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  home_team text,
  away_team text,
  home_tier smallint check (home_tier between 1 and 4),
  away_tier smallint check (away_tier between 1 and 4),
  kickoff_at timestamptz,
  tipping_opens_at timestamptz,
  tipping_closes_at timestamptz,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  status text not null default 'scheduled',
  metadata jsonb not null default '{}'::jsonb,
  unique (tournament_id, external_id)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table public.score_rules (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage text not null default 'all',
  result_type text not null check (result_type in ('outcome', 'difference', 'exact')),
  tier_difference smallint not null default 0,
  selection_type text not null check (selection_type in ('favorite', 'draw', 'underdog')),
  points numeric(8,2) not null check (points >= 0),
  unique (tournament_id, stage, result_type, tier_difference, selection_type)
);

create table public.prediction_scores (
  prediction_id uuid primary key references public.predictions(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points numeric(8,2) not null default 0,
  score_type text,
  calculated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  title text not null,
  body text not null,
  icon text,
  category text not null default 'news',
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.players(id),
  created_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text,
  rules jsonb not null default '{}'::jsonb
);

create table public.player_achievements (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (tournament_id, player_id, achievement_id)
);

create table public.rtg_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  stake_points numeric(8,2) not null check (stake_points > 0),
  multiplier numeric(8,3) not null default 1,
  status text not null default 'alive',
  earned_points numeric(8,2) not null default 0,
  unique (tournament_id, player_id, team_id)
);

create index matches_tournament_kickoff_idx
  on public.matches (tournament_id, kickoff_at);

create index predictions_tournament_player_idx
  on public.predictions (tournament_id, player_id);

create index prediction_scores_tournament_player_idx
  on public.prediction_scores (tournament_id, player_id);

create index announcements_tournament_published_idx
  on public.announcements (tournament_id, is_published, published_at desc);
