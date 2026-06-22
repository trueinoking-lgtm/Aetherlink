-- Migration: 002_cv_profiles
-- Creates cv_profiles table for structured CV data storage
-- Run this in Supabase SQL Editor

create table if not exists public.cv_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Structured CV sections stored as JSONB
  career_goal jsonb default '{}',
  personal_details jsonb default '{}',
  education jsonb default '[]',
  certifications jsonb default '[]',
  experience jsonb default '[]',
  skills jsonb default '{}',
  achievements jsonb default '[]',
  references jsonb default '[]',

  -- Metadata
  strength_score integer default 0,
  tailored_versions jsonb default '[]',
  generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id)
);

-- Enable RLS
alter table public.cv_profiles enable row level security;

-- Users can only manage their own CV profile
create policy "Users can manage own cv_profile"
  on public.cv_profiles
  for all
  using (auth.uid() = user_id);

-- Index for faster lookups
create index if not exists cv_profiles_user_id_idx
  on public.cv_profiles(user_id);

-- Trigger to auto-update updated_at
create or replace function update_cv_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cv_profiles_updated_at on public.cv_profiles;
create trigger cv_profiles_updated_at
  before update on public.cv_profiles
  for each row
  execute function update_cv_profiles_updated_at();
