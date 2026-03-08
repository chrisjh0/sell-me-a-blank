-- Run this in the Supabase SQL editor to set up the database schema.
-- Safe to run multiple times — uses IF NOT EXISTS and drops policies before recreating.

-- Tables
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  streak integer not null default 0,
  last_pitch_date date,
  created_at timestamptz default now()
);

create table if not exists pitches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  prompt text not null,
  transcript text,
  words_per_minute integer,
  filler_words integer,
  content_score integer,
  content_strengths text,
  content_improvements text,
  clarity_score integer,
  clarity_strengths text,
  clarity_improvements text,
  persuasiveness_score integer,
  persuasiveness_strengths text,
  persuasiveness_improvements text,
  pacing_score integer,
  pacing_strengths text,
  pacing_improvements text,
  confidence_score integer,
  confidence_strengths text,
  confidence_improvements text,
  overall_score numeric(5, 2),
  overall_summary text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  description text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists project_pitches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  transcript text,
  words_per_minute integer,
  filler_words integer,
  content_score integer,
  content_strengths text,
  content_improvements text,
  clarity_score integer,
  clarity_strengths text,
  clarity_improvements text,
  persuasiveness_score integer,
  persuasiveness_strengths text,
  persuasiveness_improvements text,
  pacing_score integer,
  pacing_strengths text,
  pacing_improvements text,
  confidence_score integer,
  confidence_strengths text,
  confidence_improvements text,
  overall_score numeric(5, 2),
  overall_summary text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table users enable row level security;
alter table pitches enable row level security;
alter table projects enable row level security;
alter table project_pitches enable row level security;

-- Drop existing policies before recreating (safe to re-run)
drop policy if exists "Allow all on users" on users;
drop policy if exists "Allow all on pitches" on pitches;
drop policy if exists "Allow all on projects" on projects;
drop policy if exists "Allow all on project_pitches" on project_pitches;

-- Allow all operations (username-only auth, no JWT)
create policy "Allow all on users" on users for all using (true) with check (true);
create policy "Allow all on pitches" on pitches for all using (true) with check (true);
create policy "Allow all on projects" on projects for all using (true) with check (true);
create policy "Allow all on project_pitches" on project_pitches for all using (true) with check (true);
