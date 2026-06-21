-- Migration: Update get_feed_job RPC to return all UI-required fields
-- The detail page (feed/[id]/page.tsx) expects responsibilities, location, 
-- employment_type, category, closing_date, application_phone, application_url,
-- how_to_apply, parser_status, parser_version — but the RPC was only returning
-- a subset. This migration adds all missing columns.

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
    and j.is_shared = true;
end;
$$;
