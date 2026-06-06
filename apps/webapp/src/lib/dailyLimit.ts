import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbSchema } from '@aetherlink/core';

const DAILY_LIMIT = 3;

export async function checkDailyLimit(
  supabase: SupabaseClient<DbSchema, 'public'>,
  userId: string,
): Promise<{ allowed: boolean; count: number }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_apply_count, daily_apply_reset_at')
    .eq('user_id', userId)
    .single();

  const today = new Date().toISOString().split('T')[0];
  const resetDate = profile?.daily_apply_reset_at;
  const count =
    resetDate === today ? (profile?.daily_apply_count ?? 0) : 0;

  return { allowed: count < DAILY_LIMIT, count };
}
