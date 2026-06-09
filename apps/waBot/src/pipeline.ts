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

  if (text.length < 20) {
    return false;
  }

  if (text.includes('whatsapp.com/channel/') && !lower.includes('vacancy') && !lower.includes('hiring')) {
    return false;
  }

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
  location: string | null;
  salary: string | null;
  salary_mentioned: boolean;
};

export async function structureJobPost(compressed: string): Promise<StructuredJob | null> {
  process.env.FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || env.fireworksApiKey;

  const prompt = `You are a job posting extractor for Zimbabwe. Extract structured data from the raw message below.

## RULES:
- If the message is NOT a job posting (e.g., "Jobs" alone, "Hi", "Thanks", WhatsApp channel invite), return null for all fields.
- Extract explicitly mentioned fields. If missing, use null for strings, false for salary_mentioned.

## FIELDS to extract:
- title: Job title (e.g., "Patrol Assistant", "Security Guard")
- company: Hiring organization (if not stated, use null)
- hr_email: Email address to apply (if present, else null)
- requirements: Array of strings (e.g., ["Valid driver's license", "5 years experience"]). If none, empty array.
- deadline: Application deadline in YYYY-MM-DD format (e.g., "2026-06-14"). If "ASAP" or not stated, null.
- location: City/town in Zimbabwe (e.g., "Harare", "Masvingo", "Shamva"). If multiple, take primary. If not mentioned, null.
- salary: Annual or monthly figure as string (e.g., "US$77,084.20", "$500/month"). Include currency. If not mentioned, null.
- salary_mentioned: true if salary appears anywhere (even partial), false otherwise.

## OUTPUT FORMAT:
Return ONLY valid JSON. No markdown, no extra text.
Example:
{
  "title": "Patrol Assistant",
  "company": "SecureCo",
  "hr_email": "hr@secureco.co.zw",
  "requirements": ["Valid driver's license", "Clean record"],
  "deadline": "2026-07-01",
  "location": "Harare",
  "salary": "US$350/month",
  "salary_mentioned": true
}

--- RAW MESSAGE START ---
${compressed}
--- RAW MESSAGE END ---`;

  const { text } = await executeAITask(
    'job_structure',
    prompt,
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
      location: structured.location,
      salary: structured.salary,
      salary_mentioned: structured.salary_mentioned,
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
