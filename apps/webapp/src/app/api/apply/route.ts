// @ts-nocheck - Pre-existing Supabase type generation issues
import { createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/dailyLimit';
import { getGmailAccessToken, sendGmailMessage } from '@/lib/gmail/client';
import { executeAITask } from '@aetherlink/core';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, gmail_email, gmail_refresh_token_encrypted, daily_apply_count, daily_apply_reset_at',
    )
    .eq('user_id', user.id)
    .single();

  if (!(profile as any)?.gmail_email || !(profile as any)?.gmail_refresh_token_encrypted) {
    return Response.json({ error: 'gmail_not_connected' }, { status: 403 });
  }

  const { allowed } = await checkDailyLimit(supabase, user.id);
  if (!allowed) {
    return Response.json({ error: 'daily_limit_reached' }, { status: 429 });
  }

  const { job, userProfile, cvPdfBase64, acceptedRewrites, matchScore } = await req.json();

  if (!job?.hr_email) {
    return Response.json({ error: 'no_hr_email' }, { status: 400 });
  }

  const { text: coverLetter } = await executeAITask(
    'cover_letter',
    `Write a 3-paragraph professional cover letter for a Zimbabwean jobseeker.
Job: ${job.title}${job.companyName ? ` at ${job.companyName}` : ''}
Candidate: ${userProfile.headline}
Their strengths: ${(userProfile.skills as string[])?.join(', ')}
Job requirements: ${(job.requirements as string[])?.join(', ')}

Rules:
- Tone: confident and direct. Not stiff Western corporate. Locally appropriate.
- Zero boilerplate filler. Every sentence earns its place.
- Para 1: Why this specific role. Para 2: One concrete piece of evidence from their background. Para 3: Clear call to action with availability.
- Plain text only. No markdown, no headers, no bullet points.`,
    { maxTokens: 600 },
  );

  if (!profile) {
    return Response.json({ error: 'profile_not_found' }, { status: 404 });
  }
  const accessToken = await getGmailAccessToken((profile as any).gmail_refresh_token_encrypted);
  const fullName = (profile as any).full_name || userProfile.full_name || 'Applicant';
  const pdfFilename = `${fullName.replace(/\s/g, '_')}_CV.pdf`;

  await sendGmailMessage({
    accessToken,
    fromName: fullName,
    fromEmail: (profile as any).gmail_email,
    to: job.hr_email,
    subject: `Application: ${job.title} — ${fullName}`,
    bodyText: coverLetter,
    pdfBase64: cvPdfBase64,
    pdfFilename,
  });

  await supabase.from('applications').insert({
    user_id: user.id,
    job_id: job.id,
    cover_letter: coverLetter,
    cv_version: { bullets: acceptedRewrites, matchScore },
    status: 'sent',
  } as any);

  await supabase.rpc('increment_daily_apply_count', { p_user_id: user.id } as any as never);

  return Response.json({
    success: true,
    coverLetter,
    sentAt: new Date().toISOString(),
    hrEmail: job.hr_email,
    matchScore: matchScore ?? null,
  });
}
