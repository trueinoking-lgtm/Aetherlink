import { createClient } from '@/lib/supabase/server';
import { executeAITask } from '@aetherlink/core';

export const runtime = 'nodejs';

const REQUIRED_FIELDS = ['name', 'phone', 'email', 'location', 'goal', 'education', 'experience', 'skills'] as const;

const FALLBACK_QUESTIONS = [
  "Great, let's start with your professional summary. Can you tell me your name, phone number, email address, and where you're located (city/region)?",
  "What kind of role are you targeting, and what makes you a strong fit for it?",
  "Could you describe your key technical skills and how you've applied them in recent projects?",
  "What are the most significant achievements in your career so far?",
  "Can you walk me through your work history, starting with your most recent position?",
  "Do you have any notable projects or portfolio pieces you'd like to highlight?",
  "What certifications or formal education would you like to include on your CV?",
  "Is there anything else about your background that you'd like to emphasize for this target role?",
];

export { REQUIRED_FIELDS };

/**
 * Detect question types already asked from conversation history.
 * Prevents looping on the same question type.
 */
function detectAskedQuestionTypes(messages: Array<{ role: string; content: string }>): Set<string> {
  const asked = new Set<string>();
  const lower = messages.filter(m => m.role === 'assistant').map(m => m.content.toLowerCase());

  for (const msg of lower) {
    if (msg.includes('name') || msg.includes('phone') || msg.includes('email') || msg.includes('location') || msg.includes('contact')) {
      asked.add('contact');
    }
    if (msg.includes('role') || msg.includes('targeting') || msg.includes('position') || msg.includes('career goal')) {
      asked.add('goal');
    }
    if (msg.includes('skill') || msg.includes('technical') || msg.includes('proficien')) {
      asked.add('skills');
    }
    if (msg.includes('work history') || msg.includes('experience') || msg.includes('bullet point') || msg.includes('responsibilit') || msg.includes('role at')) {
      asked.add('experience');
    }
    if (msg.includes('education') || msg.includes('school') || msg.includes('universit') || msg.includes('qualification') || msg.includes('degree')) {
      asked.add('education');
    }
    if (msg.includes('project') || msg.includes('portfolio') || msg.includes('built')) {
      asked.add('projects');
    }
    if (msg.includes('certif') || msg.includes('official') || msg.includes('training course')) {
      asked.add('certifications');
    }
    if (msg.includes('reference') || msg.includes('anything else') || msg.includes('emphasize')) {
      asked.add('references');
    }
  }
  return asked;
}

/**
 * Classify user answer sufficiency.
 */
function classifyAnswerSufficiency(
  content: string,
  questionType: string,
): 'complete' | 'usable' | 'weak' | 'missing' {
  const trimmed = content.trim();
  if (trimmed.length === 0) return 'missing';
  if (trimmed.length < 10) return 'weak';
  if (trimmed.length < 25) return 'usable';
  return 'complete';
}

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

  const askedTypes = Array.from(detectAskedQuestionTypes(messages));
  const askedTypesStr = askedTypes.length > 0 ? askedTypes.join(', ') : 'none yet';

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

  return `You are an expert AI CV interviewer for AetherLink. Your purpose is to conduct a friendly, natural CV-building interview. You ask ONE question at a time and transform rough user answers into professional CV content internally.

## CRITICAL BEHAVIOR RULES

1. **NEVER ask users to write professional CV language.** That is YOUR job.
   - BAD: "Could you please provide 2-3 concise bullet points..."
   - BAD: "Please describe your professional summary..."
   - GOOD: "What have you worked on or built?"
   - GOOD: "Tell me about your education — what did you study?"
   - GOOD: "What tools or technologies do you use?"

2. **Accept rough answers and transform them.**
   - If a user says "I built AetherLink, it gathers jobs from WhatsApp and websites" → you turn that into professional bullets
   - If a user says "taught classmates" → you expand to "Provided peer tutoring in computer science fundamentals"
   - If a user gives one-word skills → you accept them and infer proficiency from context

3. **NO LOOPING — do not ask the same question type twice.**
   Question types already asked: ${askedTypesStr}
   If a question type has been asked and the user gave ANY relevant answer, accept it and move on.
   Track what has been covered. Never repeat.

4. **Answer sufficiency scoring:**
   - If user gives a complete answer → accept, move to next missing section
   - If user gives a usable but weak answer → say "Great, I can turn that into CV bullets" and show a preview, then move on
   - If user gives a very short answer → gently ask ONE follow-up, then accept whatever they give
   - If user clearly doesn't want to answer → skip it, mark as optional

5. **Show AI phrasing previews when user gives rough info.**
   After a rough answer, include in your response:
   "AI drafted this:" followed by 2-3 polished bullet points
   Then ask: "Does this look accurate?" or just move on.

6. **Friendly, encouraging tone.**
   - "That's enough for me to work with."
   - "Great, I'll turn that into a strong project section."
   - "Nice, let's quickly cover your education next."
   - "Perfect — I have what I need for skills."

## DATA TO COLLECT

TARGET ROLE: ${targetRole}
INTERVIEW STAGE: ${stage}
CURRENT PROFILE DATA:
${profileStr}

MISSING REQUIRED FIELDS: ${JSON.stringify(missingFields)}
HAS CONTACT INFO (phone+email+location): ${hasContactFields}
MISSING OPTIONAL CONTACT FIELDS: ${JSON.stringify(missingOptional)}

CONVERSATION SO FAR:
${conversationHistory}

## COVERAGE AREAS (cover these over the course of the interview):
- contact details (name, phone, email, location — REQUIRED)
- career goal / target role
- skills (technical and soft)
- work experience (any informal counts)
- education
- projects
- certifications (detect official vs training)
- references

## RULES:
1. Ask ONE question at a time — never list multiple questions
2. Base your next question on what is STILL missing
3. For contact details: phone, email, and city/location are REQUIRED. LinkedIn/GitHub/portfolio URL are optional — only ask once
4. For certifications: detect official vs training. Keywords: 'certificate', 'certified', 'passed exam', 'earned' = official. 'course', 'training', 'studied', 'completed coursework' = training. If unclear, ask: "Was this an official certification exam you passed, or a course/training program?" Store as certificationAccuracy: 'official' | 'training' | 'unknown'
5. Be conversational, warm, encouraging — adapt to the user's language
6. Track progress against: ${JSON.stringify(requiredFields)}
7. Only mark interviewComplete: true when ALL required fields are non-empty
8. If required contact fields (phone, email, location) are missing when user asks to generate, explicitly ask for them
9. Return ONLY a valid JSON object with no markdown formatting:
   {
     "question": "...",
     "extractedData": { ... },
     "missingRequired": [...],
     "interviewComplete": boolean,
     "aiDraftedBullets": ["...", "..."]  // optional: AI-polished bullets for a section
   }
10. extractedData should only contain fields updated in the most recent user message
11. For any certification in extractedData, include "certificationAccuracy": 'official' | 'training' | 'unknown'
12. If this is the first interaction, ask an opening question about their background and what they'd like to highlight, starting with collecting contact info (name, phone, email, location)
13. If the user gives rough but usable info about a section, include "aiDraftedBullets" with 2-3 polished versions. The frontend will show these as editable previews.`;
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
    let aiDraftedBullets: string[] | undefined;
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
      missingRequired = parsed.missingRequired ?? [];
      interviewComplete = parsed.interviewComplete ?? false;
      aiDraftedBullets = parsed.aiDraftedBullets;

      debug = {
        provider: 'fireworks',
        model: process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash',
        inputTokens,
        outputTokens,
        route: 'api/cv/interview',
      };
    } catch {
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

    // Server-side safety net: merge missing fields
    {
      const mergedProfile = { ...userProfile, ...extractedData };
      const clientMissing = REQUIRED_FIELDS.filter(
        (field) =>
          !mergedProfile[field] ||
          (typeof mergedProfile[field] === 'string' && (mergedProfile[field] as string).trim() === '') ||
          (Array.isArray(mergedProfile[field]) && (mergedProfile[field] as unknown[]).length === 0),
      ) as unknown as string[];
      for (const f of clientMissing) {
        if (!missingRequired.includes(f)) {
          missingRequired.push(f);
        }
      }
      interviewComplete = missingRequired.length === 0;
    }

    return Response.json({ question, extractedData, debug, missingRequired, interviewComplete, aiDraftedBullets });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal server error';
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
