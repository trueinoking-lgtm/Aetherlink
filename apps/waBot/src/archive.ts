import crypto from 'crypto';
import { supabase } from './supabase.js';

export function hashSourceIdentifier(jid: string): string {
  return crypto.createHash('sha256').update(jid).digest('hex').slice(0, 32);
}

export async function archiveRawMessage({
  text,
  groupId,
  sourceType,
}: {
  text: string;
  groupId: string;
  sourceType: 'whatsapp_group' | 'whatsapp_channel' | 'direct_message';
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('raw_data_archive')
    .insert({
      source_type: sourceType,
      source_identifier: hashSourceIdentifier(groupId),
      raw_text: text,
      raw_timestamp: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('archive insert failed', error.message);
    return null;
  }
  return data.id as string;
}

export async function updateArchiveExtraction(
  archiveId: string,
  patch: {
    extracted_data?: Record<string, unknown>;
    extraction_confidence?: string;
    is_duplicate?: boolean;
    is_ghost_job?: boolean;
  },
) {
  await supabase.from('raw_data_archive').update(patch).eq('id', archiveId);
}
