'use server';

import { createClient } from '@/lib/supabase/server';
import { getExceptionMessage } from '@aetherlink/core';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const api = await buildApi();
    await api.loginWithEmail({ email, password });
  } catch (error) {
    return { error: getExceptionMessage(error, true) };
  }

  redirect('/feed');
}

export async function signup(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ consent_given_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
  } catch (error) {
    return { error: getExceptionMessage(error, true) };
  }
  return { success: true };
}

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
