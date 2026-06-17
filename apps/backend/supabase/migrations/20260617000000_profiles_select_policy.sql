-- Add SELECT policy for profiles so authenticated users can read their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'users read own profile'
  ) THEN
    CREATE POLICY "users read own profile" ON public.profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Also enable RLS on profiles explicitly (in case it wasn't)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
