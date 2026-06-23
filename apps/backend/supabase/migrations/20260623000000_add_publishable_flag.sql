-- Migration: Add is_publishable flag to jobs table
-- Quality gate: only surface jobs with minimum useful info to users

-- Add is_publishable flag to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_publishable boolean DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_jobs_publishable ON public.jobs(is_publishable) WHERE is_publishable = true;

-- RPC: Update list_feed_jobs to only return publishable jobs
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
    and j.is_publishable = true  -- NEW: only publishable jobs
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

-- Update get_feed_job to also check is_publishable
create or replace function public.get_feed_job(p_job_id bigint)
returns table (
  id bigint,
  title text,
  "companyName" text,
  hr_email text,
  requirements text[],
  responsibilities text[],
  location text,
  employment_type text,
  category text,
  closing_date text,
  application_phone text,
  application_email text,
  application_url text,
  how_to_apply text,
  parser_status text,
  parser_version integer,
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
    j.responsibilities,
    j.location,
    j.employment_type,
    j.category,
    j.closing_date::text,
    j.application_phone,
    j.application_email,
    j.application_url,
    j.how_to_apply,
    j.parser_status,
    j.parser_version,
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
    and j.is_shared = true
    and j.is_publishable = true;  -- NEW
end;
$$;
