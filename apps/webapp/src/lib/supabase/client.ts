'use client';

import { DbSchema } from '@aetherlink/core';
import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

export function createClient() {
  return createBrowserClient<DbSchema>(getSupabaseUrl(), getSupabaseAnonKey());
}
