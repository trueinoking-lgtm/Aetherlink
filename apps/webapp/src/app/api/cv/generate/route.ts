import { createClient } from '@/lib/supabase/server';
import { executeAITask } from '@aetherlink/core';

export const runtime = 'nodejs';

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
  "professionalSummary": "A 3-4 sentence professional summary that highlights key strengths, years of experience, and what the candidate brings to the target role.",
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
      "bullets": ["Achievement-focused bullet point", "Another bullet point"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
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
1. NEVER fabricate experience, skills, or credentials. Only use information present in the candidate's profile.
2. Infer professional wording from rough input — clean up grammar and phrasing, but do not invent fake claims.
3. Use strong action verbs and quantifiable achievements where the data supports it.
4. Group skills logically into technical, soft, and tools categories.
5. If a section has no data, include it as an empty array or null (do not omit it).
6. Keep bullet points concise (under 20 words each) and impact-focused.
7. The headline and professional summary should be tailored to the target role.`;

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

export async function POST(req: Request) {
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

    return Response.json({ cv, debug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal server error';
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
