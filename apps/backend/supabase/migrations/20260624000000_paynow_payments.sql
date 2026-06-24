-- Migration: Create payment_logs table and update_subscription RPC
-- Run this in your Supabase SQL Editor

-- 1. Create payment_logs table
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL DEFAULT 'paynow',
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reference TEXT,
  poll_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment logs
CREATE POLICY "Users can view own payment logs"
  ON public.payment_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (via webhook)
-- No client-side insert policy — only admin/service_role can insert

-- 2. Create RPC for updating subscription (bypasses type issues)
CREATE OR REPLACE FUNCTION public.update_subscription(
  p_user_id UUID,
  p_tier TEXT,
  p_end_date TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    subscription_tier = p_tier::subscription_tier_type,
    subscription_end_date = p_end_date
  WHERE user_id = p_user_id;
END;
$$;

-- 3. Create type for subscription_tier if not exists
DO $$ BEGIN
  CREATE TYPE subscription_tier_type AS ENUM ('basic', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Ensure profiles table has the right columns
ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier TYPE subscription_tier_type
  USING subscription_tier::subscription_tier_type;
