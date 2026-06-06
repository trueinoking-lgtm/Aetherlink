'use client';

import { DbSchema } from '@aetherlink/core';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient<DbSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
