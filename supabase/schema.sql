-- ============================================================
-- Draft Royale — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Profiles (extends auth.users) ──────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  created_at  timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create a blank profile placeholder on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  -- Profile is created by the app after username is chosen
  return new;
end;
$$;

-- ── Leagues ────────────────────────────────────────────────
create table public.leagues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  sport            text default 'Fantasy Football',
  commissioner_id  uuid references profiles(id) not null,
  created_at       timestamptz default now() not null
);

alter table public.leagues enable row level security;

create policy "League viewable by members"
  on leagues for select to authenticated
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = leagues.id
        and league_members.user_id = auth.uid()
    )
  );

create policy "Commissioner can update league"
  on leagues for update using (commissioner_id = auth.uid());

create policy "Authenticated users can create leagues"
  on leagues for insert to authenticated with check (commissioner_id = auth.uid());

-- ── League Members ─────────────────────────────────────────
create table public.league_members (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid references leagues(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  role       text default 'member' not null, -- 'commissioner' | 'member'
  joined_at  timestamptz default now() not null,
  unique (league_id, user_id)
);

alter table public.league_members enable row level security;

create policy "Members viewable by league members"
  on league_members for select to authenticated
  using (
    exists (
      select 1 from league_members lm
      where lm.league_id = league_members.league_id
        and lm.user_id = auth.uid()
    )
  );

create policy "Members can be inserted by commissioner or self-join"
  on league_members for insert to authenticated
  with check (
    -- joining yourself (via invite token flow) or commissioner adding
    user_id = auth.uid() or
    exists (
      select 1 from leagues
      where leagues.id = league_id
        and leagues.commissioner_id = auth.uid()
    )
  );

create policy "Commissioner can remove members"
  on league_members for delete using (
    exists (
      select 1 from leagues
      where leagues.id = league_id
        and leagues.commissioner_id = auth.uid()
    )
  );

-- ── League Invites ─────────────────────────────────────────
create table public.league_invites (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid references leagues(id) on delete cascade not null,
  email       text,                          -- optional, for reference
  token       text unique not null default replace(gen_random_uuid()::text, '-', ''),
  invited_by  uuid references profiles(id),
  status      text default 'pending' not null, -- 'pending' | 'accepted' | 'revoked'
  created_at  timestamptz default now() not null,
  expires_at  timestamptz default (now() + interval '7 days') not null
);

alter table public.league_invites enable row level security;

create policy "Invites viewable by league members"
  on league_invites for select to authenticated
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = league_invites.league_id
        and league_members.user_id = auth.uid()
    )
  );

-- Allow reading a single invite by token (for the join flow) — use a function below

create policy "Commissioner can create invites"
  on league_invites for insert to authenticated
  with check (
    exists (
      select 1 from leagues
      where leagues.id = league_id
        and leagues.commissioner_id = auth.uid()
    )
  );

create policy "Commissioner can update invite status"
  on league_invites for update using (
    exists (
      select 1 from leagues
      where leagues.id = league_id
        and leagues.commissioner_id = auth.uid()
    )
  );

-- Function to look up invite by token (bypasses RLS so unauthenticated users can check)
create or replace function public.get_invite_by_token(p_token text)
returns table (
  id uuid, league_id uuid, league_name text, status text, expires_at timestamptz
)
language sql security definer
as $$
  select
    i.id, i.league_id, l.name as league_name, i.status, i.expires_at
  from league_invites i
  join leagues l on l.id = i.league_id
  where i.token = p_token
    and i.expires_at > now()
  limit 1;
$$;

-- ── Seasons ────────────────────────────────────────────────
create table public.seasons (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid references leagues(id) on delete cascade not null,
  name       text not null,
  year       int,
  sport      text,
  status     text default 'active' not null, -- 'active' | 'complete'
  created_at timestamptz default now() not null
);

alter table public.seasons enable row level security;

create policy "Seasons viewable by league members"
  on seasons for select to authenticated
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = seasons.league_id
        and league_members.user_id = auth.uid()
    )
  );

create policy "Commissioner can manage seasons"
  on seasons for all using (
    exists (
      select 1 from leagues
      where leagues.id = league_id
        and leagues.commissioner_id = auth.uid()
    )
  );

-- ── Games ──────────────────────────────────────────────────
create table public.games (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid references leagues(id) on delete cascade not null,
  season_id        uuid references seasons(id) on delete set null,
  commissioner_id  uuid references profiles(id) not null,
  status           text default 'lobby' not null, -- 'lobby' | 'playing' | 'complete'
  game_state       jsonb,   -- full serialized GameState (real-time synced)
  created_at       timestamptz default now() not null,
  completed_at     timestamptz
);

alter table public.games enable row level security;

create policy "Games viewable by league members"
  on games for select to authenticated
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = games.league_id
        and league_members.user_id = auth.uid()
    )
  );

create policy "Commissioner can insert games"
  on games for insert to authenticated
  with check (commissioner_id = auth.uid());

create policy "Commissioner can update game state"
  on games for update using (commissioner_id = auth.uid());

-- ── Draft Results (final outcome of each game) ─────────────
create table public.draft_results (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid references games(id) on delete cascade not null,
  league_id     uuid references leagues(id) on delete cascade not null,
  season_id     uuid references seasons(id) on delete set null,
  user_id       uuid references profiles(id),
  player_name   text not null,
  pick_position int not null,
  locked        boolean default false,
  created_at    timestamptz default now() not null
);

alter table public.draft_results enable row level security;

create policy "Results viewable by league members"
  on draft_results for select to authenticated
  using (
    exists (
      select 1 from league_members
      where league_members.league_id = draft_results.league_id
        and league_members.user_id = auth.uid()
    )
  );

create policy "Commissioner can insert results"
  on draft_results for insert to authenticated
  with check (
    exists (
      select 1 from games
      where games.id = game_id
        and games.commissioner_id = auth.uid()
    )
  );

-- ── Realtime ───────────────────────────────────────────────
-- Enable realtime for games table (game_state updates)
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table league_members;
