import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let whatsappSiteId: number | null = null;

export async function getWhatsappSiteId(): Promise<number> {
  if (whatsappSiteId != null) return whatsappSiteId;
  const { data, error } = await supabase
    .from('sites')
    .select('id')
    .eq('name', 'WhatsApp')
    .eq('provider', 'custom')
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error(`WhatsApp site row not found — run migrations first: ${error?.message}`);
  }
  whatsappSiteId = data.id as number;
  return whatsappSiteId;
}
