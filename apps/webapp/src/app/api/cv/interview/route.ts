import { createClient } from '@/lib/supabase/server';
import { executeAITask } from '@aetherlink/core';

export const runtime = 'nodejs';

const FALLBACK_QUESTIONS = [
  "Great, let's start with your professional summary. Can you tell me about your current role and what you do?",
  "Could you describe your key technical skills and how you've applied them in recent projects?",
  "What are the most significant achievements in your career so far?",
  "Can you walk me through your work history, starting with your most recent position?",
  "What kind of role are you targeting, and what makes you a strong fit for it?",
  "Do you have any notable projects or portfolio pieces you'd like to highlight?",
  "What certifications or formal education would you like to include on your CV?",
  "Is there anything else about your background that you'd like to emphasize for this target role?",
];

/** Build a system prompt for an AI CV interviewer that asks dynamic follow-up questions. */
function buildInterviewPrompt(
  messages: Array<{ role: string; content: string }>,
  userProfile: Record<string, unknown>,
  targetRole: string,
  stage: string,
): string {
  const profileStr = Object.entries(userProfile)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  const conversationHistory = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  return `You are an expert AI CV interviewer for AetherLink. Your purpose is to conduct a dynamic CV-building interview, asking one focused question at a time to gather all the information needed to create a professional CV.

TARGET ROLE: ${targetRole}
INTERVIEW STAGE: ${stage}
CURRENT PROFILE DATA:
${profileStr}

CONVERSATION SO FAR:
${conversationHistory}

Rules:
1. Ask ONE question at a time — do not list multiple questions.
2. Base your next question on what information is still missing from the profile.
3. Cover these areas over the course of the interview: professional summary, skills (technical and soft), work experience (with bullet points), education, certifications, projects, and references.
4. Be conversational and professional — adapt to the user's language.
5. If all required fields appear to be filled, ask if the user wants to review and generate the CV.
6. Return ONLY a valid JSON object with no markdown formatting:
   { "question": "...", "extractedData": { ... any new fields gathered from the user's last response ... } }
7. extractedData should only contain fields that were updated in the most recent user message.
8. If this is the very first interaction (no conversation history), ask an opening question about their current role and what they'd like to highlight.`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { messages, userProfile, targetRole, stage } = await req.json();

    if (!targetRole || !stage) {
      return Response.json(
        { error: 'targetRole and stage are required' },
        { status: 400 },
      );
    }

    const prompt = buildInterviewPrompt(
      messages ?? [],
      userProfile ?? {},
      targetRole,
      stage,
    );

    let question: string;
    let extractedData: Record<string, unknown> = {};
    let debug: {
      provider: string;
      model: string;
      inputTokens?: number;
      outputTokens?: number;
      route: string;
    };

    try {
      const { text, inputTokens, outputTokens } = await executeAITask(
        'cv_interview',
        prompt,
        { responseFormat: 'json', maxTokens: 4096 },
      );

      const parsed = JSON.parse(text);
      question = parsed.question ?? FALLBACK_QUESTIONS[0];
      extractedData = parsed.extractedData ?? {};

      debug = {
        provider: 'fireworks',
        model: process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash',
        inputTokens,
        outputTokens,
        route: 'api/cv/interview',
      };
    } catch {
      // On AI failure, pick a graceful fallback question based on stage
      const fallbackIndex = Math.min(
        FALLBACK_QUESTIONS.length - 1,
        Math.max(0, ['summary', 'skills', 'experience', 'education', 'projects', 'certs', 'references'].indexOf(stage)),
      );
      question = FALLBACK_QUESTIONS[fallbackIndex] ?? FALLBACK_QUESTIONS[0];
      extractedData = {};

      debug = {
        provider: 'fireworks',
        model: process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash',
        inputTokens: 0,
        outputTokens: 0,
        route: 'api/cv/interview',
      };
    }

    return Response.json({ question, extractedData, debug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal server error';
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
