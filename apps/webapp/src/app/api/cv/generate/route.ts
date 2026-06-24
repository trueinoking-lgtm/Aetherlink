import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { executeAITask } from '@aetherlink/core';

export const runtime = 'nodejs';

/** Structure of a generated CV with the improved skills and contact fields. */
interface CvPdfData {
  headline: string;
  professionalSummary: string;
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  linkedin?: string;
  github?: string;
  portfolio?: string;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
    gpa?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
  references: string;
}

/** Build a prompt that instructs the model to return structured CV JSON. */
function buildGeneratePrompt(
  profile: Record<string, unknown>,
  targetRole: string,
  template: string,
  jobDescription?: string,
): string {
  const profileStr = JSON.stringify(profile, null, 2);

  let prompt = `You are an expert CV writer for AetherLink. Generate a structured professional CV in JSON format based on the candidate's profile below.

TARGET ROLE: ${targetRole}
TEMPLATE STYLE: ${template}
CANDIDATE PROFILE:
${profileStr}`;

  if (jobDescription?.trim()) {
    prompt += `\n\nJOB DESCRIPTION (tailor the CV to highlight relevant experience for this role):\n${jobDescription}`;
  }

  prompt += `\n\nReturn ONLY a valid JSON object with the following sections. Do NOT include markdown formatting or code fences.

Required JSON structure:
{
  "headline": "A strong one-line professional headline (e.g. 'Senior Full-Stack Engineer | React & Node.js Specialist')",
  "professionalSummary": "A 2-3 sentence professional summary that is specific to the candidate, not generic. Highlight key strengths, years of experience, and what the candidate brings to the target role.",
  "skills": {
    "technical": ["skill1", "skill2", ...],
    "soft": ["skill1", "skill2", ...],
    "tools": ["tool1", "tool2", ...]
  },
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or 'Present'",
      "bullets": ["Achievement-focused bullet point (2-3 per role)", "Another bullet point"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description using action verbs like 'Designed', 'Built', 'Developed', 'Implemented', 'Architected'",
      "technologies": ["tech1", "tech2"],
      "url": "optional url"
    }
  ],
  "education": [
    {
      "institution": "Institution Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "startYear": "YYYY",
      "endYear": "YYYY",
      "gpa": "optional GPA"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "year": "YYYY"
    }
  ],
  "references": "Available upon request" or [{"name": "...", "contact": "..."}]

CRITICAL RULES:
1. NEVER fabricate experience, skills, or credentials. Only use information present in the candidate's profile. Do NOT add skills, tools, or technologies the user did not explicitly mention.
2. Infer professional wording from rough input — clean up grammar and phrasing, but do not invent fake claims.
3. Use strong action verbs and quantifiable achievements where the data supports it.
4. Group skills logically into technical, soft, and tools categories. Only categorize skills the user actually provided — do NOT move skills into 'tools' unless they are explicitly tools/platforms (e.g., 'Git', 'VS Code', 'Docker').
5. If a section has no data, include it as an empty array or null (do not omit it).
6. Keep bullet points concise (under 20 words each) and impact-focused.
7. The headline and professional summary should be tailored to the target role.
8. For each experience entry, write 2-3 bullet points maximum. Each bullet should be rewritten professionally using strong action verbs. Expand brief descriptions into fuller bullets using context clues — but only elaborate on what the user actually did, do not invent new responsibilities.
9. For each project, use action verbs like 'Designed', 'Built', 'Developed', 'Implemented', 'Architected' to describe what you accomplished. Make the project sound employable and relevant.
10. Certification accuracy: If the user says 'CCNA certificate' or 'CCNA cert' or 'I have CCNA' → 'CCNA (Cisco Certified Network Associate)'. If they say 'CCNA course', 'CCNA training', 'studied CCNA', 'CCNA academy' → 'Cisco Networking Academy CCNA training'. Apply this pattern to all certifications — expand known acronyms with the full name in parentheses.
11. The professional summary must be exactly 2-3 sentences, specific to the candidate's background and the target role. Avoid generic phrases like 'dedicated professional' or 'team player'.`;

  return prompt;
}

/** Template-based fallback generator that maps profile fields into a basic CV structure. */
function templateGenerate(
  profile: Record<string, unknown>,
  targetRole: string,
  template: string,
): Record<string, unknown> {
  const p = profile as Record<string, any>;
  const headline =
    p.headline ||
    `${p.currentTitle || 'Professional'} targeting ${targetRole}`;

  const professionalSummary =
    p.summary || p.professionalSummary ||
    `Experienced professional with background in ${targetRole}.`;

  const skillsRaw = p.skills || [];
  const skills = Array.isArray(skillsRaw)
    ? {
        technical: skillsRaw.filter((s: string) => typeof s === 'string'),
        soft: [],
        tools: [],
      }
    : typeof skillsRaw === 'object' && skillsRaw !== null
      ? {
          technical: Array.isArray(skillsRaw.technical) ? skillsRaw.technical : [],
          soft: Array.isArray(skillsRaw.soft) ? skillsRaw.soft : [],
          tools: Array.isArray(skillsRaw.tools) ? skillsRaw.tools : [],
        }
      : { technical: [], soft: [], tools: [] };

  const experience = Array.isArray(p.experience)
    ? p.experience.map((exp: Record<string, any>) => ({
        company: exp.company || '',
        title: exp.title || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        bullets: Array.isArray(exp.bullets)
          ? exp.bullets
          : typeof exp.description === 'string'
            ? [exp.description]
            : [],
      }))
    : [];

  const education = Array.isArray(p.education)
    ? p.education.map((edu: Record<string, any>) => ({
        institution: edu.institution || edu.school || '',
        degree: edu.degree || '',
        field: edu.field || edu.major || '',
        startYear: edu.startYear || edu.startDate || '',
        endYear: edu.endYear || edu.endDate || '',
        gpa: edu.gpa || undefined,
      }))
    : [];

  const certifications = Array.isArray(p.certifications)
    ? p.certifications.map((cert: Record<string, any>) => ({
        name: cert.name || '',
        issuer: cert.issuer || cert.issuingOrg || '',
        year: cert.year || cert.date || '',
      }))
    : [];

  const projects = Array.isArray(p.projects)
    ? p.projects.map((proj: Record<string, any>) => ({
        name: proj.name || '',
        description: proj.description || '',
        technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
        url: proj.url || undefined,
      }))
    : [];

  return {
    headline,
    professionalSummary,
    skills,
    experience,
    projects,
    education,
    certifications,
    references: p.references || 'Available upon request',
  };
}

/** Build a prompt that asks the AI to critique and polish the generated CV. */
function buildCriticPrompt(cv: Record<string, unknown>): string {
  const cvJson = JSON.stringify(cv, null, 2);

  return `You are a CV quality critic and editor for AetherLink. Review the following CV JSON and identify potential issues.

CV JSON:
${cvJson}

Check for these specific issues:
1. **Missing contact details** — Are email, phone, or location fields empty or missing?
2. **Weak wording** — Do bullet points use strong action verbs (e.g., 'Led', 'Developed', 'Implemented')?
3. **Overclaimed certifications** — Do any certification names appear inflated or inaccurate?
4. **Too much whitespace** — Are sections sparse or lacking sufficient content?
5. **Generic summary** — Is the professional summary vague, clichéd, or not specific to the candidate?
6. **ATS readability** — Would an ATS parser struggle with the structure or formatting?
7. **One-page layout risk** — Is there too much content for a single page?

Return ONLY a valid JSON object with this exact structure — no markdown, no code fences:
{
  "warnings": [
    "Describe the issue and how to fix it"
  ],
  "polished_cv": {
    ... the complete CV JSON with any improvements applied ...
  }
}

Rules:
- If a section has no issues, simply include it as-is in the polished_cv without changes.
- Fix any issues you find in the polished_cv (e.g., improve weak wording, expand certification names, tighten the summary).
- The polished_cv must be the COMPLETE CV object, not just the changed parts.
- If no issues found at all, return an empty warnings array and the original CV unchanged.`;
}

export async function POST(req: Request) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, remaining, resetAt } = checkRateLimit(`cv:${clientIp}`);
  if (!allowed) {
    return Response.json(
      { error: 'rate_limit_exceeded', message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(allowed, remaining, resetAt) },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { profile, targetRole, template, jobDescription } = await req.json();

    if (!profile || !targetRole || !template) {
      return Response.json(
        { error: 'profile, targetRole, and template are required' },
        { status: 400 },
      );
    }

    const prompt = buildGeneratePrompt(profile, targetRole, template, jobDescription);

    let cv: Record<string, unknown>;
    let debug: {
      provider: string;
      model: string;
      inputTokens?: number;
      outputTokens?: number;
      route: string;
    };
    let warnings: string[] = [];

    try {
      const { text, inputTokens, outputTokens } = await executeAITask(
        'cv_generate',
        prompt,
        { responseFormat: 'json', maxTokens: 4096 },
      );

      cv = JSON.parse(text);

      debug = {
        provider: 'fireworks',
        model: process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash',
        inputTokens,
        outputTokens,
        route: 'api/cv/generate',
      };

      // Second AI pass: CV critic — reviews and polishes the generated CV
      try {
        const criticPrompt = buildCriticPrompt(cv);
        const { text: criticText } = await executeAITask(
          'cv_critic',
          criticPrompt,
          { responseFormat: 'json', maxTokens: 4096 },
        );
        const criticResult = JSON.parse(criticText);
        warnings = Array.isArray(criticResult.warnings) ? criticResult.warnings : [];
        if (criticResult.polished_cv && typeof criticResult.polished_cv === 'object') {
          cv = criticResult.polished_cv;
        }
      } catch {
        // Critic pass is best-effort; keep original CV and empty warnings on failure
      }
    } catch {
      // On AI failure, fall back to template-based generator
      cv = templateGenerate(profile, targetRole, template);

      debug = {
        provider: 'fireworks',
        model: process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash',
        inputTokens: 0,
        outputTokens: 0,
        route: 'api/cv/generate',
      };
    }

    return Response.json({ cv, debug, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal server error';
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
