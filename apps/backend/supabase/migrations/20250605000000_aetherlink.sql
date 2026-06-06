-- AetherLink schema additions (additive only — no column removals)

-- WhatsApp source site for bot-inserted jobs
insert into public.sites (name, urls, logo_url, provider, blacklisted_paths)
select
  'WhatsApp',
  array['https://whatsapp.com/']::text[],
  'https://vnawaforiamopaudfefi.supabase.co/storage/v1/object/public/first2apply-public/custom.png',
  'custom',
  array['/']::text[]
where not exists (
  select 1 from public.sites where name = 'WhatsApp' and provider = 'custom'
);

-- Jobs table extensions
alter table public.jobs add column if not exists hr_email text;
alter table public.jobs add column if not exists requirements text[];
alter table public.jobs add column if not exists source_group text;
alter table public.jobs add column if not exists post_hash text;
alter table public.jobs add column if not exists repost_count integer default 0;
alter table public.jobs add column if not exists deadline text;
alter table public.jobs add column if not exists opportunity_window_expires_at timestamptz;
alter table public.jobs add column if not exists raw_text text;
alter table public.jobs add column if not exists is_shared boolean default false;

create unique index if not exists jobs_post_hash_unique_idx on public.jobs (post_hash) where post_hash is not null;

-- Employer trust signals
create table if not exists public.employer_signals (
  id uuid primary key default gen_random_uuid(),
  hr_email text not null unique,
  verified boolean default false,
  response_count integer default 0,
  no_response_count integer default 0,
  flagged_count integer default 0,
  last_seen timestamptz,
  updated_at timestamptz default now()
);

-- CV versions
create table if not exists public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer default 1,
  cv_data jsonb not null,
  created_at timestamptz default now()
);

alter table public.cv_versions enable row level security;

create policy "users manage own cvs" on public.cv_versions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id bigint not null references public.jobs(id) on delete cascade,
  cover_letter text,
  cv_version jsonb,
  status text not null default 'sent',
  outcome text,
  outcome_recorded_at timestamptz,
  response_days integer,
  created_at timestamptz default now(),
  unique(user_id, job_id)
);

alter table public.applications enable row level security;

create policy "users manage own applications" on public.applications
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Raw data archive (service role only)
create table if not exists public.raw_data_archive (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_identifier text,
  raw_text text not null,
  raw_timestamp timestamptz not null,
  extracted_data jsonb,
  extraction_confidence text,
  view_count integer default 0,
  apply_count integer default 0,
  skip_count integer default 0,
  response_received boolean,
  response_days integer,
  outcome text,
  skill_tags text[],
  experience_level text,
  salary_mentioned boolean default false,
  salary_raw text,
  location_mentioned text,
  industry_tag text,
  is_duplicate boolean default false,
  is_ghost_job boolean default false,
  is_verified_employer boolean default false,
  data_version text default 'v1',
  anonymized_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.raw_data_archive enable row level security;

create policy "service role only raw_data_archive" on public.raw_data_archive
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Profiles extensions
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists skills text[];
alter table public.profiles add column if not exists certifications text[];
alter table public.profiles add column if not exists gmail_email text;
alter table public.profiles add column if not exists gmail_refresh_token_encrypted text;
alter table public.profiles add column if not exists consent_given_at timestamptz;
alter table public.profiles add column if not exists daily_apply_count integer default 0;
alter table public.profiles add column if not exists daily_apply_reset_at date default current_date;

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Shared jobs: all authenticated users can read
create policy "authenticated users read shared jobs" on public.jobs
  for select to authenticated
  using (is_shared = true);

-- Employer signals readable by authenticated users
alter table public.employer_signals enable row level security;

create policy "authenticated read employer_signals" on public.employer_signals
  for select to authenticated
  using (true);

-- RPC: upsert employer signal on new HR email sighting
create or replace function public.upsert_employer_signal(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.employer_signals (hr_email, last_seen, updated_at)
  values (lower(trim(p_email)), now(), now())
  on conflict (hr_email) do update set
    last_seen = now(),
    updated_at = now();
end;
$$;

-- RPC: atomic daily apply count increment with date reset
create or replace function public.increment_daily_apply_count(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
  today date := current_date;
begin
  update public.profiles
  set
    daily_apply_count = case
      when daily_apply_reset_at = today then daily_apply_count + 1
      else 1
    end,
    daily_apply_reset_at = today
  where user_id = p_user_id
  returning daily_apply_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

-- RPC: list shared feed jobs (excludes jobs user already applied to)
create or replace function public.list_feed_jobs(
  jobs_after text default null,
  jobs_page_size integer default 50,
  jobs_search text default null
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  after_id integer;
  after_updated_at timestamptz;
  current_user_id uuid := auth.uid();
begin
  if jobs_after is not null then
    after_id := split_part(jobs_after, '!', 1)::integer;
    after_updated_at := split_part(jobs_after, '!', 2)::timestamptz;
  end if;

  return query
  select j.*
  from public.jobs j
  where j.is_shared = true
    and j.status = 'new'::"Job Status"
    and (jobs_after is null or (j.updated_at, j.id) < (after_updated_at, after_id))
    and (jobs_search is null or j.job_search_vector @@ plainto_tsquery('english', jobs_search))
    and not exists (
      select 1 from public.applications a
      where a.job_id = j.id and a.user_id = current_user_id
    )
  order by j.created_at desc, j.id desc
  limit jobs_page_size;
end;
$$;

-- RPC: get single feed job with employer verified flag
create or replace function public.get_feed_job(p_job_id bigint)
returns table (
  id bigint,
  title text,
  "companyName" text,
  hr_email text,
  requirements text[],
  source_group text,
  post_hash text,
  repost_count integer,
  deadline text,
  opportunity_window_expires_at timestamptz,
  raw_text text,
  description text,
  status public."Job Status",
  created_at timestamptz,
  updated_at timestamptz,
  employer_verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    j.id,
    j.title,
    j."companyName",
    j.hr_email,
    j.requirements,
    j.source_group,
    j.post_hash,
    j.repost_count,
    j.deadline,
    j.opportunity_window_expires_at,
    j.raw_text,
    j.description,
    j.status,
    j.created_at,
    j.updated_at,
    coalesce(es.verified, false) as employer_verified
  from public.jobs j
  left join public.employer_signals es on lower(es.hr_email) = lower(j.hr_email)
  where j.id = p_job_id
    and j.is_shared = true;
end;
$$;
