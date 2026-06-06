import crypto from 'crypto';
import { executeAITask, parseJSONObject } from '@aetherlink/core';
import { archiveRawMessage, updateArchiveExtraction } from './archive.js';
import { env } from './env.js';
import { getWhatsappSiteId, supabase } from './supabase.js';

const JOB_KEYWORDS = [
  'cv',
  'vacancy',
  'hiring',
  'apply',
  'position',
  'opportunity',
  'urgently',
  'wanted',
  'recruitment',
  'job',
  'opening',
  'role',
];

export function isJobPost(text: string): boolean {
  const lower = text.toLowerCase();
  return JOB_KEYWORDS.some((kw) => lower.includes(kw));
}

export function compressText(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\x00-\x7F]/g, '')
    .trim()
    .substring(0, 800);
}

export function postHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function isDuplicate(text: string): Promise<{ isDupe: boolean; existingId?: number }> {
  const hash = postHash(text);
  const { data } = await supabase
    .from('jobs')
    .select('id, repost_count')
    .eq('post_hash', hash)
    .maybeSingle();

  if (data) {
    await supabase
      .from('jobs')
      .update({ repost_count: (data.repost_count ?? 0) + 1 })
      .eq('id', data.id);
    return { isDupe: true, existingId: data.id as number };
  }
  return { isDupe: false };
}

type StructuredJob = {
  title: string;
  company: string | null;
  hr_email: string | null;
  requirements: string[];
  deadline: string | null;
};

export async function structureJobPost(compressed: string): Promise<StructuredJob | null> {
  process.env.FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || env.fireworksApiKey;

  const { text } = await executeAITask(
    'job_structure',
    `Extract job details. Return ONLY valid JSON, no markdown, no preamble.
Schema: {"title": string, "company": string|null, "hr_email": string|null, "requirements": string[], "deadline": string|null}
Text: ${compressed}`,
    { responseFormat: 'json', maxTokens: 512 },
  );

  try {
    return parseJSONObject<StructuredJob>(text);
  } catch {
    return null;
  }
}

export async function processMessage(text: string, groupId: string, isDirect = false) {
  const sourceType = isDirect ? 'direct_message' : 'whatsapp_group';
  const archiveId = await archiveRawMessage({ text, groupId, sourceType });

  if (!isJobPost(text)) {
    return;
  }

  const hash = postHash(text);
  const { isDupe } = await isDuplicate(text);
  if (isDupe) {
    if (archiveId) {
      await updateArchiveExtraction(archiveId, {
        is_duplicate: true,
        extraction_confidence: 'high',
      });
    }
    return;
  }

  const compressed = compressText(text);
  const structured = await structureJobPost(compressed);
  if (!structured?.title) {
    if (archiveId) {
      await updateArchiveExtraction(archiveId, {
        extraction_confidence: 'failed',
      });
    }
    return;
  }

  const siteId = await getWhatsappSiteId();
  const opportunityWindow = new Date();
  opportunityWindow.setHours(opportunityWindow.getHours() + 18);

  const { data: inserted, error } = await supabase
    .from('jobs')
    .insert({
      user_id: env.botUserId,
      externalId: hash,
      externalUrl: `${env.webappBaseUrl}/j/placeholder`,
      siteId,
      title: structured.title,
      companyName: structured.company || 'Unknown',
      hr_email: structured.hr_email,
      requirements: structured.requirements ?? [],
      deadline: structured.deadline,
      raw_text: text,
      description: text,
      post_hash: hash,
      source_group: hashSourceGroup(groupId),
      status: 'new',
      is_shared: true,
      opportunity_window_expires_at: opportunityWindow.toISOString(),
      tags: [],
      labels: [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('job insert failed', error.message);
    return;
  }

  const jobId = inserted.id as number;
  await supabase
    .from('jobs')
    .update({ externalUrl: `${env.webappBaseUrl}/j/${jobId}` })
    .eq('id', jobId);

  if (structured.hr_email) {
    await supabase.rpc('upsert_employer_signal', { p_email: structured.hr_email });
  }

  if (archiveId) {
    await updateArchiveExtraction(archiveId, {
      extracted_data: structured as unknown as Record<string, unknown>,
      extraction_confidence: 'high',
      is_duplicate: false,
      is_ghost_job: false,
    });
  }
}

function hashSourceGroup(groupId: string): string {
  return crypto.createHash('sha256').update(groupId).digest('hex').slice(0, 32);
}
