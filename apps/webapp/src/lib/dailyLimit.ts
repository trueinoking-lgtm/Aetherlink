// @ts-nocheck - Pre-existing Supabase type generation issues
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
  // @ts-ignore - Supabase type generation missing these columns
  const resetDate = profile?.daily_apply_reset_at;
  // @ts-ignore
  const count = resetDate === today ? (profile?.daily_apply_count ?? 0) : 0;

  return { allowed: count < DAILY_LIMIT, count };
}
