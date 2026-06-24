-- Migration: CV Journey Persistence (cv_conversations, generated_cvs)
-- Agent-led CV creation conversation history and generated CV storage

-- ─── cv_conversations: Chat history for each CV journey ───
CREATE TABLE IF NOT EXISTS public.cv_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_profile_id uuid references public.cv_profiles(id) on delete cascade,
  messages jsonb default '[]',
  current_stage text default 'intro',
  completed_stages text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.cv_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cv_conversations"
  ON public.cv_conversations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can access all cv_conversations"
  ON public.cv_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cv_conversations_user_id ON public.cv_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_conversations_profile ON public.cv_conversations(user_id, cv_profile_id);

-- ─── generated_cvs: Saved generated CV versions ───
CREATE TABLE IF NOT EXISTS public.generated_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_profile_id uuid references public.cv_profiles(id) on delete cascade,
  job_id bigint null references public.jobs(id) on delete set null,
  cv_type text not null check (cv_type in ('general', 'tailored')),
  content_markdown text not null,
  content_json jsonb default '{}',
  created_at timestamptz default now()
);

ALTER TABLE public.generated_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own generated_cvs"
  ON public.generated_cvs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can access all generated_cvs"
  ON public.generated_cvs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_generated_cvs_user_id ON public.generated_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_cvs_profile ON public.generated_cvs(user_id, cv_profile_id);
CREATE INDEX IF NOT EXISTS idx_generated_cvs_job ON public.generated_cvs(job_id);

-- ─── Add updated_at trigger to cv_conversations ───
CREATE OR REPLACE FUNCTION update_cv_conversations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cv_conversations_updated_at ON public.cv_conversations;
CREATE TRIGGER cv_conversations_updated_at
  BEFORE UPDATE ON public.cv_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_cv_conversations_updated_at();

-- ─── Add missing columns to cv_profiles if not present ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='full_name') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN full_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='phone') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='email') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='location') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='career_goal') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN career_goal text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='target_roles') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN target_roles text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='professional_summary') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN professional_summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='skills') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN skills jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='education') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN education jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='experience') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN experience jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='projects') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN projects jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='certifications') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN certifications jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='languages') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN languages jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='references_text') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN references_text text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='raw_conversation_summary') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN raw_conversation_summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='missing_info') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN missing_info jsonb default '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cv_profiles' AND column_name='cv_strength_score') THEN
    ALTER TABLE public.cv_profiles ADD COLUMN cv_strength_score integer default 0;
  END IF;
END $$;

-- ─── Fix existing cv_profiles RLS to allow service_role bypass ───
-- The original policy from 002_cv_profiles.sql only allows auth.uid() = user_id
-- which blocks service_role (auth.uid() returns NULL for service_role).
-- Add a service_role bypass policy.
CREATE POLICY "Service role can access all cv_profiles"
  ON public.cv_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── RPC: Save generated CV ───
CREATE OR REPLACE FUNCTION public.save_generated_cv(
  p_cv_profile_id uuid,
  p_job_id bigint DEFAULT null,
  p_cv_type text DEFAULT 'general',
  p_content_markdown text DEFAULT '',
  p_content_json jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.generated_cvs (user_id, cv_profile_id, job_id, cv_type, content_markdown, content_json)
  VALUES (auth.uid(), p_cv_profile_id, p_job_id, p_cv_type, p_content_markdown, p_content_json)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ─── RPC: Get latest generated CV for user ───
CREATE OR REPLACE FUNCTION public.get_latest_generated_cv(p_job_id bigint DEFAULT null)
RETURNS TABLE (
  id uuid,
  cv_type text,
  content_markdown text,
  content_json jsonb,
  job_id bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.cv_type, g.content_markdown, g.content_json, g.job_id, g.created_at
  FROM public.generated_cvs g
  WHERE g.user_id = auth.uid()
    AND (p_job_id IS NULL OR g.job_id = p_job_id)
  ORDER BY g.created_at DESC
  LIMIT 1;
END;
$$;
