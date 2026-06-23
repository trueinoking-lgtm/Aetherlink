-- Migration: Add job_cta_clicks analytics table
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
