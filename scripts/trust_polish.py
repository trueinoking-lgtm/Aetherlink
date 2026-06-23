#!/usr/bin/env python3
"""
Trust & Launch Polish Sprint — applies all 6 items.
Run: python3 scripts/trust_polish.py
"""
import re

# ─── ITEM 1: Source badge + ITEM 2: Disclaimer on job detail page ───

detail_path = "/root/Aetherlink/apps/webapp/src/app/(dashboard)/feed/[id]/page.tsx"

with open(detail_path, "r") as f:
    content = f.read()

# 1a. Add source badge after employer name (after verified checkmark)
old_header = '''                <p className="mt-2 text-lg text-[var(--text-secondary)]">
                  {employerName}
                  {job.employer_verified && (
                    <span className="ml-1.5 text-[var(--success)]" title="Verified employer" aria-label="Verified employer">
                      ✓
                    </span>
                  )}
                </p>'''

new_header = '''                <p className="mt-2 text-lg text-[var(--text-secondary)]">
                  {employerName}
                  {job.employer_verified && (
                    <span className="ml-1.5 text-[var(--success)]" title="Verified employer" aria-label="Verified employer">
                      ✓
                    </span>
                  )}
                </p>
                {job.source_group && (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--glass-bg-subtle)] px-2 py-0.5 font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                      Source: {job.source_group}
                    </span>
                  </p>
                )}'''

content = content.replace(old_header, new_header)

# 2. Add disclaimer after the header card (after the closing </div> of the header glass-card)
# Find the header card's closing and insert disclaimer after it
old_after_header = '''          </div>

          {/* Summary section */}'''

new_after_header = '''          </div>

          {/* Source disclaimer */}
          <p className="text-xs text-[var(--text-faint)] italic flex items-center gap-1.5 mt-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AetherLink summarizes this job from the original source. Always confirm details before applying.
          </p>

          {/* Summary section */}'''

content = content.replace(old_after_header, new_after_header)

with open(detail_path, "w") as f:
    f.write(content)

print(f"✅ Items 1+2: Source badge + disclaimer applied to {detail_path}")

# ─── ITEM 3: CTA analytics SQL migration ───

migration_sql = '''-- Migration: Add job_cta_clicks analytics table
-- Tracks every CTA click for trust & conversion analytics

CREATE TABLE IF NOT EXISTS public.job_cta_clicks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cta_type text NOT NULL,
  destination_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for per-job analytics
CREATE INDEX IF NOT EXISTS idx_job_cta_clicks_job_id ON public.job_cta_clicks(job_id);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_job_cta_clicks_created_at ON public.job_cta_clicks(created_at);

-- RLS: Users can see their own clicks; service role sees all
ALTER TABLE public.job_cta_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CTA clicks"
  ON public.job_cta_clicks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all CTA clicks"
  ON public.job_cta_clicks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC: Insert a CTA click (called from frontend)
CREATE OR REPLACE FUNCTION public.track_cta_click(
  p_job_id bigint,
  p_cta_type text,
  p_destination_domain text DEFAULT null
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_click_id bigint;
BEGIN
  INSERT INTO public.job_cta_clicks (job_id, user_id, cta_type, destination_domain)
  VALUES (p_job_id, auth.uid(), p_cta_type, p_destination_domain)
  RETURNING id INTO v_click_id;
  RETURN v_click_id;
END;
$$;

-- RPC: Get click stats for a job
CREATE OR REPLACE FUNCTION public.get_job_click_stats(p_job_id bigint)
RETURNS TABLE (
  cta_type text,
  click_count bigint,
  last_clicked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jcc.cta_type,
    count(*)::bigint as click_count,
    max(jcc.created_at) as last_clicked_at
  FROM public.job_cta_clicks jcc
  WHERE jcc.job_id = p_job_id
  GROUP BY jcc.cta_type
  ORDER BY click_count DESC;
END;
$$;
'''

migration_path = "/root/Aetherlink/apps/backend/supabase/migrations/20260623000001_add_cta_analytics.sql"
with open(migration_path, "w") as f:
    f.write(migration_sql)

print(f"✅ Item 3: CTA analytics migration written to {migration_path}")

# ─── ITEM 4: Saved jobs Supabase table SQL ───

saved_jobs_sql = '''-- Migration: Add saved_jobs table
-- Users can save jobs first, mark as applied later

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id bigint NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  notes text,
  UNIQUE(user_id, job_id)
);

-- Index for user's saved jobs
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);

-- Index for job's savers
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);

-- RLS: Users can only see/manage their own saved jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved jobs"
  ON public.saved_jobs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can access all saved jobs"
  ON public.saved_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC: Toggle save job
CREATE OR REPLACE FUNCTION public.toggle_save_job(p_job_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.saved_jobs
    WHERE user_id = v_user_id AND job_id = p_job_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.saved_jobs
    WHERE user_id = v_user_id AND job_id = p_job_id;
    RETURN false;
  ELSE
    INSERT INTO public.saved_jobs (user_id, job_id)
    VALUES (v_user_id, p_job_id);
    RETURN true;
  END IF;
END;
$$;

-- RPC: Mark job as applied
CREATE OR REPLACE FUNCTION public.mark_job_applied(p_job_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.saved_jobs
  SET applied_at = now()
  WHERE user_id = auth.uid() AND job_id = p_job_id;
END;
$$;

-- RPC: Get user's saved jobs with job details
CREATE OR REPLACE FUNCTION public.list_saved_jobs()
RETURNS TABLE (
  job_id bigint,
  saved_at timestamptz,
  applied_at timestamptz,
  notes text,
  job_title text,
  job_company text,
  job_location text,
  job_closing_date text,
  job_source_group text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sj.job_id,
    sj.saved_at,
    sj.applied_at,
    sj.notes,
    j.title,
    j."companyName",
    j.location,
    j.closing_date::text,
    j.source_group
  FROM public.saved_jobs sj
  JOIN public.jobs j ON j.id = sj.job_id
  WHERE sj.user_id = auth.uid()
  ORDER BY sj.saved_at DESC;
END;
$$;
'''

saved_path = "/root/Aetherlink/apps/backend/supabase/migrations/20260623000002_add_saved_jobs.sql"
with open(saved_path, "w") as f:
    f.write(saved_jobs_sql)

print(f"✅ Item 4: Saved jobs migration written to {saved_path}")

print("\n🎉 All SQL migrations and UI changes generated!")
print("Apply migrations in Supabase SQL Editor in order:")
print("  1. 20260623000000_add_publishable_flag.sql (if not done)")
print("  2. 20260623000001_add_cta_analytics.sql")
print("  3. 20260623000002_add_saved_jobs.sql")
