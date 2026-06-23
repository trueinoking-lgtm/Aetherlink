-- Migration: Add saved_jobs table
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
