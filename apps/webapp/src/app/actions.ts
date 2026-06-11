'use server';

import { createClient } from '@/lib/supabase/server';
import { getExceptionMessage } from '@aetherlink/core';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import { redirect } from 'next/navigation';

export async function signOut() {
  try {
    const api = await buildApi();
    await api.logout();
  } catch (error) {
    return { error: getExceptionMessage(error) };
  }

  redirect('/');
}

async function buildApi() {
  const supabase = await createClient();
  return new AetherLinkSupabaseApi(supabase);
}