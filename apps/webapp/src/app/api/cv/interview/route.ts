import { createClient } from '@/lib/supabase/server';
import { executeAITask } from '@aetherlink/core';

export const runtime = 'nodejs';

const REQUIRED_FIELDS = ['name', 'phone', 'email', 'location', 'goal', 'education', 'experience', 'skills'] as const;

const FALLBACK_QUESTIONS = [
  "Great, let's start with your professional summary. Can you tell me your name, phone number, email address, and where you're located (city/region)?",
  "What kind of role are you targeting, and what makes you a strong fit for it?",
  "Could you describe your key technical skills and how you've applied them in recent projects? Please elaborate on your proficiency level for each skill.",
  "What are the most significant achievements in your career so far?",
  "Can you walk me through your work history, starting with your most recent position? For each role, please share 2-3 bullet points covering your responsibilities and the impact you made.",
  "Do you have any notable projects or portfolio pieces you'd like to highlight? What was the outcome or impact of those projects?",
  "What certifications or formal education would you like to include on your CV?",
  "Is there anything else about your background that you'd like to emphasize for this target role?",
];

// Fields the system considers required before the interview can be marked complete
export { REQUIRED_FIELDS };

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

  const requiredFields = REQUIRED_FIELDS;
  const missingFields = requiredFields.filter(
    (field) =>
      !userProfile[field] ||
      (typeof userProfile[field] === 'string' && (userProfile[field] as string).trim() === '') ||
      (Array.isArray(userProfile[field]) && (userProfile[field] as unknown[]).length === 0),
  );

  const hasContactFields = !!(userProfile.phone && userProfile.email && userProfile.location);
  const optionalContactFields = ['linkedin', 'github', 'portfolioUrl'];
  const missingOptional = optionalContactFields.filter(
    (field) =>
      !userProfile[field] ||
      (typeof userProfile[field] === 'string' && (userProfile[field] as string).trim() === ''),
  );

  return `You are an expert AI CV interviewer for AetherLink. Your purpose is to conduct a dynamic CV-building interview, asking one focused question at a time to gather all the information needed to create a professional CV.

TARGET ROLE: ${targetRole}
INTERVIEW STAGE: ${stage}
CURRENT PROFILE DATA:
${profileStr}

MISSING REQUIRED FIELDS: ${JSON.stringify(missingFields)}
HAS CONTACT INFO (phone+email+location): ${hasContactFields}
MISSING OPTIONAL CONTACT FIELDS: ${JSON.stringify(missingOptional)}

CONVERSATION SO FAR:
${conversationHistory}

Rules:
1. Ask ONE question at a time — do not list multiple questions.
2. Base your next question on what information is still missing from the profile.
3. Cover these areas over the course of the interview: contact details (phone, email, city/location — REQUIRED before completion), professional summary, skills (technical and soft), work experience (with bullet points), education, certifications, projects, and references.
4. For contact details, phone, email, and city/location are REQUIRED. LinkedIn, GitHub, and portfolio URL are optional — only ask about them once if the user does not proactively share them.
5. For certification entries: detect whether each certification is official or just training. Keywords indicating OFFICIAL certification include: 'certificate', 'certified', 'passed exam', 'earned'. Keywords indicating TRAINING/COURSEWORK include: 'course', 'training', 'studied', 'completed coursework', 'academy'. If unclear, ask a clarifying question like "Was this an official certification exam you passed, or a course/training program you completed?" Store the result as certificationAccuracy: 'official' | 'training' | 'unknown'.
6. For work experience entries: always ask for 2-3 bullet points per role covering responsibilities AND the impact/outcome of your work — not just what you built, but what it achieved (e.g., performance gains, revenue growth, user adoption).
7. For skills: when the user gives a one-word skill (e.g., "Python"), ask them to elaborate on their proficiency level (e.g., beginner, intermediate, advanced, expert) and how they've applied it.
8. For projects: ask about the outcome or impact, not just what was built.
9. Be conversational and professional — adapt to the user's language.
10. Track progress against these required fields: ${JSON.stringify(requiredFields)}. Only mark interviewComplete: true when ALL are non-empty.
11. If any required contact field (phone, email, location) is missing when the user indicates they are done or asks to generate, explicitly ask for the missing required field(s).
12. Return ONLY a valid JSON object with no markdown formatting:
    { "question": "...", "extractedData": { ... }, "missingRequired": [...], "interviewComplete": boolean }
13. extractedData should only contain fields that were updated in the most recent user message.
14. For any certification mentioned in extractedData, include a "certificationAccuracy" field set to "official", "training", or "unknown" based on keyword analysis.
15. If this is the very first interaction (no conversation history), ask an opening question about their current role and what they'd like to highlight, starting with collecting their contact info (name, phone, email, location).`;
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
    let missingRequired: string[] = [];
    let interviewComplete = false;
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
      // Accept missingRequired from AI, or compute from profile
      missingRequired = parsed.missingRequired ?? [];
      interviewComplete = parsed.interviewComplete ?? false;

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
      missingRequired = REQUIRED_FIELDS.filter(
        (field) =>
          !userProfile[field] ||
          (typeof userProfile[field] === 'string' && (userProfile[field] as string).trim() === '') ||
          (Array.isArray(userProfile[field]) && (userProfile[field] as unknown[]).length === 0),
      ) as unknown as string[];
      interviewComplete = missingRequired.length === 0;

      debug = {
        provider: 'fireworks',
        model: process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash',
        inputTokens: 0,
        outputTokens: 0,
        route: 'api/cv/interview',
      };
    }

    // Ensure missingRequired includes contact fields if not present
    // (server-side safety net in case AI misses them)
    {
      // Check which required fields are still missing in both userProfile and extractedData
      const mergedProfile = { ...userProfile, ...extractedData };
      const clientMissing = REQUIRED_FIELDS.filter(
        (field) =>
          !mergedProfile[field] ||
          (typeof mergedProfile[field] === 'string' && (mergedProfile[field] as string).trim() === '') ||
          (Array.isArray(mergedProfile[field]) && (mergedProfile[field] as unknown[]).length === 0),
      ) as unknown as string[];
      // Merge any missing fields the AI didn't catch
      for (const f of clientMissing) {
        if (!missingRequired.includes(f)) {
          missingRequired.push(f);
        }
      }
      // Re-check completeness
      interviewComplete = missingRequired.length === 0;
    }

    return Response.json({ question, extractedData, debug, missingRequired, interviewComplete });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal server error';
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
