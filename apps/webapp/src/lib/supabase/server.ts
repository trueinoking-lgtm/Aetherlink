import { DbSchema } from '@aetherlink/core';
import { type CookieMethodsServer, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

export async function createClient() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Called from a Server Component — safe to ignore
        // when middleware is refreshing sessions.
      }
    },
  };

  return createServerClient<DbSchema>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: cookieMethods,
  });
}
