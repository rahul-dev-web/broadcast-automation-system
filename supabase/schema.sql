-- Draft schema for the tournament/broadcast MVP.
-- Auth/RLS policies will be added during the security integration phase.

create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_matches integer not null check (total_matches between 1 and 50),
  pt_mode text not null check (pt_mode in ('PER_MATCH', 'OVERALL_ONLY', 'CUSTOM')),
  selected_pt_matches integer[] not null default '{}',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'READY', 'LIVE', 'COMPLETED', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_number integer not null check (team_number between 1 and 12),
  team_name text,
  team_prefix text,
  logo_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tournament_id, team_number)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 5),
  display_name text,
  in_game_name text,
  is_substitute boolean not null default false,
  created_at timestamptz not null default now(),
  unique (team_id, slot_number)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_number integer not null check (match_number between 1 and 50),
  status text not null default 'PENDING' check (status in ('PENDING', 'LIVE', 'REVIEW', 'VERIFIED')),
  started_at timestamptz,
  ended_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, match_number)
);

create table if not exists public.match_team_state (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  kills integer not null default 0 check (kills >= 0),
  placement integer check (placement between 1 and 12),
  kill_points integer not null default 0 check (kill_points >= 0),
  position_points integer not null default 0 check (position_points >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  elimination_status text not null default 'ALIVE' check (elimination_status in ('ALIVE', 'ELIMINATED')),
  current_player_id uuid references public.players(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create table if not exists public.scoring_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  sequence_no bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.ocr_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  source_type text not null check (source_type in ('FINAL_STANDING', 'LIVE_PLAYER')),
  raw_ocr_data jsonb not null default '{}',
  parsed_data jsonb not null default '{}',
  confidence numeric,
  status text not null default 'PROCESSING' check (status in ('PROCESSING', 'PROPOSED', 'REVIEWED', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  result_data jsonb not null default '{}',
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.broadcast_sessions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  state text not null default 'SETUP',
  state_payload jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_team_state enable row level security;
alter table public.scoring_events enable row level security;
alter table public.ocr_results enable row level security;
alter table public.match_results enable row level security;
alter table public.broadcast_sessions enable row level security;


-- Development-stage policies. Replace with authenticated tenant/operator policies before production.
create policy "dev_public_read_tournaments" on public.tournaments for select to anon, authenticated using (true);
create policy "dev_public_insert_tournaments" on public.tournaments for insert to anon, authenticated with check (true);
create policy "dev_public_update_tournaments" on public.tournaments for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_teams" on public.teams for select to anon, authenticated using (true);
create policy "dev_public_insert_teams" on public.teams for insert to anon, authenticated with check (true);
create policy "dev_public_update_teams" on public.teams for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_players" on public.players for select to anon, authenticated using (true);
create policy "dev_public_insert_players" on public.players for insert to anon, authenticated with check (true);
create policy "dev_public_update_players" on public.players for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_matches" on public.matches for select to anon, authenticated using (true);
create policy "dev_public_insert_matches" on public.matches for insert to anon, authenticated with check (true);
create policy "dev_public_update_matches" on public.matches for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_match_team_state" on public.match_team_state for select to anon, authenticated using (true);
create policy "dev_public_insert_match_team_state" on public.match_team_state for insert to anon, authenticated with check (true);
create policy "dev_public_update_match_team_state" on public.match_team_state for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_scoring_events" on public.scoring_events for select to anon, authenticated using (true);
create policy "dev_public_insert_scoring_events" on public.scoring_events for insert to anon, authenticated with check (true);
create policy "dev_public_read_ocr_results" on public.ocr_results for select to anon, authenticated using (true);
create policy "dev_public_insert_ocr_results" on public.ocr_results for insert to anon, authenticated with check (true);
create policy "dev_public_update_ocr_results" on public.ocr_results for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_match_results" on public.match_results for select to anon, authenticated using (true);
create policy "dev_public_insert_match_results" on public.match_results for insert to anon, authenticated with check (true);
create policy "dev_public_update_match_results" on public.match_results for update to anon, authenticated using (true) with check (true);
create policy "dev_public_read_broadcast_sessions" on public.broadcast_sessions for select to anon, authenticated using (true);
create policy "dev_public_insert_broadcast_sessions" on public.broadcast_sessions for insert to anon, authenticated with check (true);
create policy "dev_public_update_broadcast_sessions" on public.broadcast_sessions for update to anon, authenticated using (true) with check (true);

alter table public.players drop constraint if exists players_substitute_slot_consistency;
alter table public.players add constraint players_substitute_slot_consistency
  check ((slot_number = 5 and is_substitute = true) or (slot_number between 1 and 4 and is_substitute = false));

create index if not exists idx_teams_tournament on public.teams(tournament_id);
create index if not exists idx_players_team on public.players(team_id);
create index if not exists idx_matches_tournament on public.matches(tournament_id);
create index if not exists idx_match_team_state_match on public.match_team_state(match_id);
create index if not exists idx_scoring_events_match_sequence on public.scoring_events(match_id, sequence_no);
create index if not exists idx_ocr_results_match_status on public.ocr_results(match_id, status);
create index if not exists idx_broadcast_sessions_tournament on public.broadcast_sessions(tournament_id);
