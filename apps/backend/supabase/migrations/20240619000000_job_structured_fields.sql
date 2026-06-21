-- AetherLink Job Structured Fields Migration
-- Adds structured parsing fields to jobs table for Jobs Zimbabwe format

-- Add structured job fields for better data extraction and display
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT[] NOT NULL DEFAULT '{}',
  
  -- requirements already exists but ensure NOT NULL constraint
  ADD COLUMN IF NOT EXISTS requirements TEXT[] NOT NULL DEFAULT '{}',
  
  ADD COLUMN IF NOT EXISTS how_to_apply TEXT,
  ADD COLUMN IF NOT EXISTS application_email TEXT,
  ADD COLUMN IF NOT EXISTS application_phone TEXT,
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS parser_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS parser_version INTEGER NOT NULL DEFAULT 1;

-- Update existing requirements column to match NOT NULL constraint
UPDATE public.jobs 
SET requirements = '{}'::TEXT[] 
WHERE requirements IS NULL;

ALTER TABLE public.jobs 
  ALTER COLUMN requirements SET NOT NULL,
  ALTER COLUMN requirements SET DEFAULT '{}'::TEXT[];

-- Create index for parser status for faster backfill queries
CREATE INDEX IF NOT EXISTS idx_jobs_parser_status ON public.jobs(parser_status)
WHERE parser_status = 'pending';

-- Comment explaining the migration purpose
COMMENT ON TABLE public.jobs IS 'Jobs table with structured fields for parsing from Jobs Zimbabwe format';

-- Helper function to update parser status
CREATE OR REPLACE FUNCTION update_job_parser_status(
  job_id BIGINT,
  status TEXT,
  version INTEGER DEFAULT 2
) RETURNS void AS $$
BEGIN
  UPDATE public.jobs
  SET parser_status = status,
      parser_version = version,
      updated_at = NOW()
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;