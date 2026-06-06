import { createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/dailyLimit';
import { executeAITask, parseJSONArray } from '@aetherlink/core';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { allowed } = await checkDailyLimit(supabase, user.id);
  if (!allowed) {
    return Response.json({ error: 'daily_limit_reached' }, { status: 429 });
  }

  const { bullets, jobTitle, missingRequirements } = await req.json();

  const { text } = await executeAITask(
    'cv_rewrite',
    `You are an expert CV writer for the Zimbabwean job market.
Rewrite these CV bullet points to better align with: "${jobTitle}".
Candidate is weak on: ${(missingRequirements as string[]).join(', ')}.

Rules:
- Never fabricate experience or skills. Reframe only what exists.
- Use stronger, specific action verbs
- Mirror job requirement language where genuinely applicable
- Each bullet stays under 15 words
- Return ONLY a valid JSON array, no markdown

Bullets: ${JSON.stringify(bullets)}
Return: [{"original": "...", "rewritten": "...", "change_reason": "..."}]`,
    { responseFormat: 'json', maxTokens: 1024 },
  );

  try {
    const rewrites = parseJSONArray<
      Array<{ original: string; rewritten: string; change_reason: string }>
    >(text);
    return Response.json({ rewrites });
  } catch {
    return Response.json({ error: 'parse_failed' }, { status: 500 });
  }
}
