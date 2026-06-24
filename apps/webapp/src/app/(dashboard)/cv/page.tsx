'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateCvPdf, CvPdfData } from '@/lib/cvPdf';

// ─── Types ───────────────────────────────────────────────

interface PersonalDetails {
  fullName: string;
  phone: string;
  email: string;
  location: string;
}

interface EducationEntry {
  institution: string;
  qualification: string;
  year: string;
}

interface ExperienceEntry {
  role: string;
  company: string;
  duration: string;
  description: string;
}

interface ProjectEntry {
  name: string;
  description: string;
  technologies: string;
}

interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

interface CvData {
  personalDetails: PersonalDetails;
  careerGoal: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  achievements: string[];
  references: string;
  professionalSummary: string;
  headline: string;
}

interface DebugInfo {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  route: string;
  fallback?: boolean;
}

const EMPTY_CV: CvData = {
  personalDetails: { fullName: '', phone: '', email: '', location: '' },
  careerGoal: '',
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  references: '',
  professionalSummary: '',
  headline: '',
};

// ─── Strength Score ──────────────────────────────────────

function computeStrengthScore(data: CvData): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];

  // ─── Helper to detect common CV typos ──────────────────
  const hasTypo = (s: string): boolean =>
    /\b(pythob|phython|javascrit|javasript|typescrit|typscript|communcation|teamwrok|leardership|managemetn|organisational|analytial|probelm|solv(e|ing)|htlm|htmll?|csss?|bootstrap)\b/i.test(s);

  const rawSkills = normalizeSkills(data.skills);
  const skills = rawSkills.filter(s => s.trim().length > 0);
  const hasLowercaseFrags = skills.some(s => /^[a-z]/.test(s.trim()));
  const hasTyposInSkills = skills.some(s => hasTypo(s.trim()));

  // ─── 1. Contact info present (15 pts) ──────────────────
  if (data.personalDetails.fullName.trim().length > 2) score += 5;
  else missing.push('Add your full name');

  if (data.personalDetails.email.trim() || data.personalDetails.phone.trim()) score += 5;
  else missing.push('Add an email or phone number');

  if (data.personalDetails.location.trim()) score += 5;
  else missing.push('Add your location');

  // ─── 2. Role clarity (10 pts) ──────────────────────────
  const goal = data.careerGoal.trim();
  const genericGoal = /\b(anything|any\s*job|any\s*work|not\s*sure|i\s*don'?t\s*know|idk|undecided|no\s*preference|open\s*to\s*(anything|all|everything))\b/i;
  if (goal) {
    score += 4;
    if (goal.length > 15) score += 3;
    if (!genericGoal.test(goal)) score += 3;
    else missing.push('Make your career goal more specific (e.g., "Software Developer" not "anything")');
  } else {
    missing.push('Add a career goal');
  }

  // ─── 3. Skills quality (15 pts) ────────────────────────
  if (skills.length >= 3) {
    score += 5;
    if (!hasLowercaseFrags) score += 5;
    else missing.push('Capitalize your skills (e.g., "Python" not "python")');
    if (!hasTyposInSkills) score += 5;
    else missing.push('Fix typos in your skills (e.g., "Python" not "pythob")');
  } else if (skills.length > 0) {
    missing.push('Add more skills (aim for 3+)');
  } else {
    missing.push('Add at least 3 skills');
  }

  // ─── 4. Experience strength (20 pts) ──────────────────
  const exp = data.experience || [];
  if (exp.length > 0) {
    score += 8;
    const withDesc = exp.filter(e => e.description && e.description.trim().length > 5);
    if (withDesc.length > 0) {
      score += 7;
      const substantial = withDesc.filter(e => e.description.trim().length > 30);
      if (substantial.length >= exp.length / 2) score += 5;
      else missing.push('Add more detail to your experience descriptions');
    } else {
      missing.push('Add bullet points/descriptions to your experience');
    }
  } else {
    missing.push('Add work/volunteer/informal experience');
  }

  // ─── 5. Project detail (10 pts) ────────────────────────
  const projects = data.projects || [];
  if (projects.length > 0) {
    score += 5;
    const withProjDesc = projects.filter(p => p.description && p.description.trim().length > 5);
    if (withProjDesc.length > 0) score += 5;
    else missing.push('Add descriptions to your projects');
  } else {
    missing.push('Add projects if available');
  }

  // ─── 6. Education clarity (10 pts) ─────────────────────
  const edu = data.education || [];
  if (edu.length > 0) {
    score += 5;
    const structured = edu.filter(e => e.institution.trim() && e.qualification.trim());
    if (structured.length === edu.length) score += 5;
    else missing.push('Add institution and qualification for each education entry');
  } else {
    missing.push('Add education details');
  }

  // ─── 7. Certifications (5 pts) ─────────────────────────
  if ((data.certifications || []).length > 0) score += 5;
  else missing.push('Add certifications if available');

  // ─── 8. Grammar / Professional polish (10 pts) ─────────
  if (skills.length > 0) {
    if (!hasLowercaseFrags) score += 4;
    if (!hasTyposInSkills) score += 3;
    const longFrags = skills.filter(s => s.trim().split(/\s+/).length > 4);
    if (longFrags.length === 0) score += 3;
  }

  // ─── 9. ATS friendliness (5 pts) ──────────────────────
  const summary = data.professionalSummary.trim();
  if (summary) {
    score += 3;
    if (summary.length > 40) score += 2;
    else missing.push('Expand your professional summary for ATS optimization');
  } else {
    missing.push('Add a professional summary');
  }

  // ─── Penalties ────────────────────────────────────────
  if (hasLowercaseFrags || hasTyposInSkills) score -= 10;
  if (exp.length > 0 && !exp.some(e => e.description && e.description.trim().length > 5)) score -= 5;
  if (!summary) score -= 5;
  if (!data.references.trim()) score -= 3;

  // Clamp between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return { score, missing };
}

/** Get a friendly label and color for a strength score. */
function getScoreMeta(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'var(--success)' };
  if (score >= 60) return { label: 'Strong', color: 'var(--success)' };
  if (score >= 40) return { label: 'Good start', color: 'var(--warning)' };
  if (score >= 20) return { label: 'Getting there', color: 'var(--warning)' };
  return { label: 'Let\'s build!', color: 'var(--danger)' };
}

/** Identify what's strong in the CV so far. */
function computeStrengths(data: CvData): string[] {
  const strong: string[] = [];
  if (data.personalDetails.fullName && (data.personalDetails.email || data.personalDetails.phone) && data.personalDetails.location) {
    strong.push('Contact details');
  }
  if (data.careerGoal) strong.push('Career direction');
  if (normalizeSkills(data.skills).length >= 3) strong.push('Skills');
  if ((data.experience || []).length > 0 && data.experience.some(e => e.description?.trim().length > 5)) {
    strong.push('Project experience');
  }
  if ((data.projects || []).length > 0) strong.push('Projects');
  if ((data.education || []).length > 0) strong.push('Education');
  if ((data.certifications || []).length > 0) strong.push('Certifications');
  if (data.professionalSummary) strong.push('Professional summary');
  return strong;
}

// ─── Helpers ─────────────────────────────────────────────

/** Normalize skills to string[] — flattens object shapes like { technical, soft, tools }. */
function normalizeSkills(skills: unknown): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.map(s => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object') {
        // Try common key names, then fall back to string
        const obj = s as Record<string, unknown>;
        return String(obj.name ?? obj.skill ?? obj.label ?? Object.values(obj).find(v => typeof v === 'string') ?? JSON.stringify(obj));
      }
      return String(s);
    }).filter(Boolean);
  }
  if (typeof skills === 'object' && skills !== null) {
    const obj = skills as Record<string, unknown>;
    const flat: string[] = [];
    for (const key of ['technical', 'soft', 'tools', 'skills', 'all']) {
      if (Array.isArray(obj[key])) {
        flat.push(...obj[key].map(String));
      }
    }
    if (flat.length > 0) return [...new Set(flat)];
    // Try all values that are strings
    return Object.values(obj).filter(v => typeof v === 'string').map(String);
  }
  return [String(skills)];
}

/** Classify a question into a topic for loop detection. */
function classifyQuestion(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('skill')) return 'skills';
  if (q.includes('experience') || q.includes('work history') || q.includes('previous job')) return 'experience';
  if (q.includes('education') || q.includes('study') || q.includes('school') || q.includes('university') || q.includes('college') || q.includes('degree')) return 'education';
  if (q.includes('project')) return 'projects';
  if (q.includes('certif') || q.includes('license') || q.includes('credential')) return 'certifications';
  if (q.includes('name') || q.includes('contact') || q.includes('email') || q.includes('phone')) return 'personal';
  if (q.includes('goal') || q.includes('career') || q.includes('target role')) return 'career';
  if (q.includes('generate') || q.includes('complete') || q.includes('ready')) return 'completion';
  return 'other';
}

/** Merge AI-extracted fields into CvData. Supports both flat keys and nested shapes. */
function mergeExtractedData(cvData: CvData, extracted: Record<string, unknown>): CvData {
  const next = { ...cvData };

  if (extracted.fullName && typeof extracted.fullName === 'string') {
    next.personalDetails = { ...next.personalDetails, fullName: extracted.fullName };
  }
  if (extracted.email && typeof extracted.email === 'string') {
    next.personalDetails = { ...next.personalDetails, email: extracted.email };
  }
  if (extracted.phone && typeof extracted.phone === 'string') {
    next.personalDetails = { ...next.personalDetails, phone: extracted.phone };
  }
  if (extracted.location && typeof extracted.location === 'string') {
    next.personalDetails = { ...next.personalDetails, location: extracted.location };
  }
  if (extracted.careerGoal && typeof extracted.careerGoal === 'string') {
    next.careerGoal = extracted.careerGoal;
  }
  if (extracted.targetRole && typeof extracted.targetRole === 'string') {
    next.careerGoal = extracted.targetRole;
  }
  if (extracted.headline && typeof extracted.headline === 'string') {
    next.headline = extracted.headline;
  }
  if (extracted.professionalSummary && typeof extracted.professionalSummary === 'string') {
    next.professionalSummary = extracted.professionalSummary;
  }
  if (extracted.skills) {
    const normalized = normalizeSkills(extracted.skills);
    if (normalized.length > 0) {
      next.skills = [...new Set([...next.skills, ...normalized])];
    }
  }
  if (Array.isArray(extracted.experience)) {
    next.experience = extracted.experience.map((e: any) => ({
      role: e.role || e.title || '',
      company: e.company || '',
      duration: e.duration || '',
      description: e.description || e.bullets?.join('\n') || '',
    }));
  }
  if (Array.isArray(extracted.education)) {
    next.education = extracted.education.map((e: any) => ({
      institution: e.institution || e.school || '',
      qualification: e.qualification || e.degree || '',
      year: e.year || e.endYear || '',
    }));
  }
  if (Array.isArray(extracted.projects)) {
    next.projects = extracted.projects.map((p: any) => ({
      name: p.name || '',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || ''),
    }));
  }
  if (Array.isArray(extracted.certifications)) {
    next.certifications = extracted.certifications.map((c: any) => ({
      name: c.name || '',
      issuer: c.issuer || '',
      year: c.year || '',
    }));
  }
  if (Array.isArray(extracted.achievements)) {
    next.achievements = [...next.achievements, ...extracted.achievements.map(String)];
  }
  if (extracted.references && typeof extracted.references === 'string') {
    next.references = extracted.references;
  }

  return next;
}

/** Map generated CV structure + CvData into CvPdfData for PDF generation. */
function toCvPdfData(generatedCv: Record<string, unknown>, cvData: CvData): CvPdfData {
  const g = generatedCv;
  const skillsArray: string[] = Array.isArray(g.skills)
    ? g.skills.map(String)
    : [
        ...(Array.isArray((g.skills as any)?.technical) ? (g.skills as any).technical : []),
        ...(Array.isArray((g.skills as any)?.soft) ? (g.skills as any).soft : []),
        ...(Array.isArray((g.skills as any)?.tools) ? (g.skills as any).tools : []),
      ];

  return {
    fullName: cvData.personalDetails.fullName,
    headline: (g.headline as string) || '',
    email: cvData.personalDetails.email,
    phone: cvData.personalDetails.phone,
    location: cvData.personalDetails.location,
    professionalSummary: (g.professionalSummary as string) || '',
    skills: skillsArray,
    experience: (Array.isArray(g.experience) ? g.experience : []).map((e: any) => ({
      role: e.title || e.role || '',
      company: e.company || '',
      duration: e.startDate && e.endDate ? `${e.startDate} – ${e.endDate}` : (e.duration || ''),
      bullets: Array.isArray(e.bullets) ? e.bullets : (e.description ? [e.description] : []),
    })),
    projects: (Array.isArray(g.projects) ? g.projects : []).map((p: any) => ({
      name: p.name || '',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || ''),
    })),
    education: (Array.isArray(g.education) ? g.education : []).map((e: any) => ({
      qualification: e.degree
        ? `${e.degree}${e.field ? ` in ${e.field}` : ''}`
        : (e.qualification || ''),
      institution: e.institution || '',
      year: e.year || e.endYear || '',
    })),
    certifications: (Array.isArray(g.certifications) ? g.certifications : []).map((c: any) => ({
      name: c.name || '',
      issuer: c.issuer || '',
      year: c.year || '',
    })),
    references: (g.references as string) || 'Available on request',
  };
}

/** Check whether the AI's question suggests the interview is complete. */
function isCompletionQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return (
    lower.includes('generate your cv') ||
    lower.includes('ready to generate') ||
    lower.includes('shall i generate') ||
    lower.includes('review your cv') ||
    lower.includes('enough information') ||
    lower.includes('would you like me to generate') ||
    lower.includes('i have enough') ||
    (lower.includes('generate') && lower.includes('cv')) ||
    (lower.includes('create your') && lower.includes('cv'))
  );
}

// ─── Main Page Component ──────────────────────────────────

export default function CVJourneyPage() {
  const supabase = createClient();
  const router = useRouter();

  // ── Core state ──
  const [cvData, setCvData] = useState<CvData>(EMPTY_CV);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Interview state ──
  const [hasStarted, setHasStarted] = useState(false);
  const [interviewMessages, setInterviewMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [interviewComplete, setIsInterviewComplete] = useState(false);
  const [input, setInput] = useState('');
  const [extractedData, setExtractedData] = useState<Record<string, unknown>>({});

  // ── Generation state ──
  const [generatedCv, setGeneratedCv] = useState<Record<string, unknown> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Debug state ──
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // ── Inline editing state (post-generation) ──
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // ── AI Draft Preview state ──
  const [draftBullets, setDraftBullets] = useState<string[] | null>(null);
  const [draftQuestion, setDraftQuestion] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftEditText, setDraftEditText] = useState('');
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);

  // ── Short answer prompt state ──
  const [shortAnswerPrompt, setShortAnswerPrompt] = useState<string | null>(null);
  const [pendingShortAnswer, setPendingShortAnswer] = useState<string | null>(null);

  // ── Loop detection state ──
  const [recentQuestionTypes, setRecentQuestionTypes] = useState<string[]>([]);
  const autoAcceptRef = useRef(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessagesRef = useRef(interviewMessages);

  // Keep ref in sync for regeneration use
  lastMessagesRef.current = interviewMessages;

  const { score, missing } = computeStrengthScore(cvData);
  const scoreMeta = getScoreMeta(score);
  const strengths = computeStrengths(cvData);

  // ─── Determine debug visibility ──
  useEffect(() => {
    const isDev = process.env.NODE_ENV !== 'production';
    const hasDebugParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
    setShowDebug(isDev || hasDebugParam);
  }, []);

  // ─── Load existing data ──────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }

        const local = localStorage.getItem('aetherlink_cv_data');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setCvData({ ...EMPTY_CV, ...parsed });
          } catch { /* ignore */ }
        }

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cv_profiles?user_id=eq.${user.id}&select=*`,
            { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }
          );
          if (res.ok) {
            const profiles = await res.json();
            if (profiles && profiles.length > 0) {
              const p = profiles[0];
              const supabaseData: CvData = {
                personalDetails: p.personal_details || EMPTY_CV.personalDetails,
                careerGoal: p.career_goal || '',
                education: p.education || [],
                experience: p.experience || [],
                skills: normalizeSkills(p.skills),
                projects: p.projects || [],
                certifications: p.certifications || [],
                achievements: p.achievements || [],
                references: p.references_text || '',
                professionalSummary: p.professional_summary || '',
                headline: p.headline || '',
              };
              const supStr = JSON.stringify(supabaseData).length;
              const localStr = JSON.stringify(cvData).length;
              if (supStr > localStr) {
                setCvData(supabaseData);
              }
            }
          }
        } catch { /* table may not exist yet */ }

        const conv = localStorage.getItem('aetherlink_cv_interview');
        if (conv) {
          try {
            const parsed = JSON.parse(conv);
            if (parsed.messages && parsed.messages.length > 0) {
              setInterviewMessages(parsed.messages);
              setHasStarted(true);
              if (parsed.extractedData) setExtractedData(parsed.extractedData);
              if (parsed.complete) setIsInterviewComplete(true);
            }
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error('CV load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-save interview state
  useEffect(() => {
    if (!loading && interviewMessages.length > 0) {
      localStorage.setItem('aetherlink_cv_interview', JSON.stringify({
        messages: interviewMessages,
        extractedData,
        complete: interviewComplete,
      }));
    }
  }, [interviewMessages, extractedData, interviewComplete, loading]);

  // Auto-save CV data
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('aetherlink_cv_data', JSON.stringify(cvData));
    }
  }, [cvData, loading]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewMessages, currentQuestion, draftBullets]);

  // ─── Loop detection: auto-accept repeated question types ──
  useEffect(() => {
    if (autoAcceptRef.current) {
      autoAcceptRef.current = false;
      // Auto-accept by sending a brief acknowledgement
      const doAutoAccept = async () => {
        setIsAsking(true);
        const autoAnswer = 'Got it, let\'s move on.';
        const updatedMessages = [...interviewMessages, { role: 'user' as const, content: autoAnswer }];
        setInterviewMessages(updatedMessages);

        try {
          const res = await fetch('/api/cv/interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: updatedMessages,
              userProfile: extractedData,
              targetRole: cvData.careerGoal || '',
              stage: 'continue',
            }),
          });

          if (!res.ok) throw new Error(`API error ${res.status}`);

          const data = await res.json();
          const question: string = data.question || 'Could you tell me more?';

          if (data.extractedData && typeof data.extractedData === 'object') {
            const newExtracted = { ...extractedData, ...data.extractedData };
            setExtractedData(newExtracted);
            setCvData(prev => mergeExtractedData(prev, data.extractedData));
          }

          const complete = isCompletionQuestion(question);
          setCurrentQuestion(question);
          setInterviewMessages(prev => [...prev, { role: 'assistant', content: question }]);
          setIsInterviewComplete(complete);
          setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });
        } catch {
          const fallbackQ = 'Alright, let\'s keep going. What else should I know about you?';
          setCurrentQuestion(fallbackQ);
          setInterviewMessages(prev => [...prev, { role: 'assistant', content: fallbackQ }]);
          setDebugInfo({
            provider: 'fireworks',
            model: 'deepseek-v4-flash',
            route: 'api/cv/interview',
            fallback: true,
          });
        } finally {
          setIsAsking(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      };
      doAutoAccept();
    }
  }, [autoAcceptRef.current]);

  // ─── Interview: start ────────────────────────────────────
  const handleStart = useCallback(async () => {
    setHasStarted(true);
    setIsAsking(true);

    try {
      const res = await fetch('/api/cv/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          userProfile: {},
          targetRole: '',
          stage: 'intro',
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      const question: string = data.question || 'Hey! Let\'s get your CV started. Tell me about yourself - what kind of role are you looking for?';

      setCurrentQuestion(question);
      setInterviewMessages([{ role: 'assistant', content: question }]);
      setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });
    } catch {
      const fallbackQ = 'Hey! Let\'s get your CV started. Tell me about yourself - what kind of role are you looking for?';
      setCurrentQuestion(fallbackQ);
      setInterviewMessages([{ role: 'assistant', content: fallbackQ }]);
      setDebugInfo({
        provider: 'fireworks',
        model: 'deepseek-v4-flash',
        route: 'api/cv/interview',
        fallback: true,
      });
    } finally {
      setIsAsking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // ─── Interview: send answer ──────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isAsking) return;

    // ─── Answer sufficiency check ──────────────────────────
    // If we were prompting for more detail and user is responding
    if (shortAnswerPrompt !== null) {
      const combined = pendingShortAnswer
        ? `${pendingShortAnswer} ${trimmed}`
        : trimmed;
      setShortAnswerPrompt(null);
      setPendingShortAnswer(null);

      // Proceed with the combined answer
      setInput('');
      setIsAsking(true);

      const updatedMessages = [...interviewMessages, { role: 'user' as const, content: combined }];
      setInterviewMessages(updatedMessages);

      try {
        const res = await fetch('/api/cv/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            userProfile: extractedData,
            targetRole: cvData.careerGoal || '',
            stage: 'continue',
          }),
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);

        const data = await res.json();
        const question: string = data.question || 'Could you tell me more?';

        if (data.extractedData && typeof data.extractedData === 'object') {
          const newExtracted = { ...extractedData, ...data.extractedData };
          setExtractedData(newExtracted);
          setCvData(prev => mergeExtractedData(prev, data.extractedData));
        }

        // Handle AI drafted bullets
        if (data.aiDraftedBullets && Array.isArray(data.aiDraftedBullets) && data.aiDraftedBullets.length > 0) {
          setDraftBullets(data.aiDraftedBullets);
          setDraftEditText(data.aiDraftedBullets.join('\n'));
          setDraftQuestion(question);
          setIsEditingDraft(false);
          // Don't add the question yet — wait for draft accept
        } else {
          const complete = isCompletionQuestion(question);
          setCurrentQuestion(question);
          setInterviewMessages(prev => [...prev, { role: 'assistant', content: question }]);
          setIsInterviewComplete(complete);
        }

        setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });
      } catch {
        const fallbackQ = 'Thanks for that! Let\'s keep moving.';
        setCurrentQuestion(fallbackQ);
        setInterviewMessages(prev => [...prev, { role: 'assistant', content: fallbackQ }]);
        setDebugInfo({
          provider: 'fireworks',
          model: 'deepseek-v4-flash',
          route: 'api/cv/interview',
          fallback: true,
        });
      } finally {
        setIsAsking(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      return;
    }

    // Check answer length
    if (trimmed.length < 10) {
      // Very short answer — gently ask once for more
      setShortAnswerPrompt(trimmed);
      setPendingShortAnswer(trimmed);
      setInput('');
      return;
    }

    // Brief answer (10-25 chars) or full answer (>25 chars)
    setInput('');
    setIsAsking(true);

    const updatedMessages = [...interviewMessages, { role: 'user' as const, content: trimmed }];
    setInterviewMessages(updatedMessages);

    try {
      const res = await fetch('/api/cv/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          userProfile: extractedData,
          targetRole: cvData.careerGoal || '',
          stage: 'continue',
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      const question: string = data.question || 'Could you tell me more?';

      // Merge extracted data
      if (data.extractedData && typeof data.extractedData === 'object') {
        const newExtracted = { ...extractedData, ...data.extractedData };
        setExtractedData(newExtracted);
        setCvData(prev => mergeExtractedData(prev, data.extractedData));
      }

      // ─── Loop detection ──────────────────────────────────
      const qType = classifyQuestion(question);
      setRecentQuestionTypes(prev => {
        const next = [...prev, qType].slice(-3);
        // Check for duplicate
        const lastTwo = next.slice(-2);
        if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1] && lastTwo[0] !== 'completion' && lastTwo[0] !== 'other') {
          autoAcceptRef.current = true;
        }
        return next;
      });

      // Handle AI drafted bullets
      if (data.aiDraftedBullets && Array.isArray(data.aiDraftedBullets) && data.aiDraftedBullets.length > 0) {
        setDraftBullets(data.aiDraftedBullets);
        setDraftEditText(data.aiDraftedBullets.join('\n'));
        setDraftQuestion(question);
        setIsEditingDraft(false);
        // If it was a brief answer (10-25 chars), add an "I'll work with that" message
        if (trimmed.length >= 10 && trimmed.length <= 25) {
          setInterviewMessages(prev => [...prev, {
            role: 'assistant',
            content: "That's enough for me to work with. I'll polish this into something solid."
          }]);
        }
        // Don't add next question yet
      } else {
        // Check if interview is complete
        const complete = isCompletionQuestion(question);

        // If brief answer with no drafted bullets, add a reassuring message
        if (trimmed.length >= 10 && trimmed.length <= 25 && !complete) {
          const casualReplies = [
            "Got it - I'll work with that!",
            "Nice, I have what I need there.",
            "That works! Let's keep going.",
            "Great, I can work with that. On to the next thing."
          ];
          setInterviewMessages(prev => [...prev, {
            role: 'assistant',
            content: casualReplies[Math.floor(Math.random() * casualReplies.length)]
          }]);
        }

        setCurrentQuestion(question);
        setInterviewMessages(prev => [...prev, { role: 'assistant', content: question }]);
        setIsInterviewComplete(complete);
      }

      setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });
    } catch {
      const fallbackQ = 'Got it! Let\'s keep going - what else should I know?';
      setCurrentQuestion(fallbackQ);
      setInterviewMessages(prev => [...prev, { role: 'assistant', content: fallbackQ }]);
      setDebugInfo({
        provider: 'fireworks',
        model: 'deepseek-v4-flash',
        route: 'api/cv/interview',
        fallback: true,
      });
    } finally {
      setIsAsking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, interviewMessages, extractedData, cvData.careerGoal, isAsking, shortAnswerPrompt, pendingShortAnswer]);

  // ─── Draft: Accept ───────────────────────────────────────
  const handleAcceptDraft = useCallback(() => {
    if (!draftQuestion) return;
    const complete = isCompletionQuestion(draftQuestion);
    setCurrentQuestion(draftQuestion);
    setInterviewMessages(prev => [...prev, { role: 'assistant', content: draftQuestion }]);
    setIsInterviewComplete(complete);
    setDraftBullets(null);
    setDraftQuestion('');
    setDraftEditText('');
    setIsEditingDraft(false);
  }, [draftQuestion]);

  // ─── Draft: Edit toggle ──────────────────────────────────
  const handleEditDraft = useCallback(() => {
    setIsEditingDraft(prev => !prev);
  }, []);

  // ─── Draft: Save edited text ─────────────────────────────
  const handleSaveDraftEdit = useCallback(() => {
    const lines = draftEditText.split('\n').filter(l => l.trim());
    setDraftBullets(lines);
    setIsEditingDraft(false);
    // Then accept
    handleAcceptDraft();
  }, [draftEditText, handleAcceptDraft]);

  // ─── Draft: Regenerate ───────────────────────────────────
  const handleRegenerateDraft = useCallback(async () => {
    if (isRegeneratingDraft) return;
    setIsRegeneratingDraft(true);

    try {
      // Re-call the interview API with the current messages to get new phrasing
      // We use the same messages that produced the draft (without the draft question)
      const res = await fetch('/api/cv/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: interviewMessages,
          userProfile: extractedData,
          targetRole: cvData.careerGoal || '',
          stage: 'continue',
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      if (data.aiDraftedBullets && Array.isArray(data.aiDraftedBullets) && data.aiDraftedBullets.length > 0) {
        setDraftBullets(data.aiDraftedBullets);
        setDraftEditText(data.aiDraftedBullets.join('\n'));
        setDraftQuestion(data.question || draftQuestion);
      } else {
        // No bullets this time — just accept with whatever we have
        handleAcceptDraft();
      }
      setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });
    } catch {
      // Keep existing draft on error
    } finally {
      setIsRegeneratingDraft(false);
    }
  }, [interviewMessages, extractedData, cvData.careerGoal, draftQuestion, isRegeneratingDraft, handleAcceptDraft]);

  // ─── Short answer: proceed with short answer ─────────────
  const handleProceedWithShortAnswer = useCallback(async () => {
    if (!pendingShortAnswer) return;
    const short = pendingShortAnswer;
    setShortAnswerPrompt(null);
    setPendingShortAnswer(null);
    setInput('');
    setIsAsking(true);

    const updatedMessages = [...interviewMessages, { role: 'user' as const, content: short }];
    setInterviewMessages(updatedMessages);

    try {
      const res = await fetch('/api/cv/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          userProfile: extractedData,
          targetRole: cvData.careerGoal || '',
          stage: 'continue',
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      const question: string = data.question || 'Could you tell me more?';

      if (data.extractedData && typeof data.extractedData === 'object') {
        const newExtracted = { ...extractedData, ...data.extractedData };
        setExtractedData(newExtracted);
        setCvData(prev => mergeExtractedData(prev, data.extractedData));
      }

      if (data.aiDraftedBullets && Array.isArray(data.aiDraftedBullets) && data.aiDraftedBullets.length > 0) {
        setDraftBullets(data.aiDraftedBullets);
        setDraftEditText(data.aiDraftedBullets.join('\n'));
        setDraftQuestion(question);
        setIsEditingDraft(false);
      } else {
        const complete = isCompletionQuestion(question);
        setCurrentQuestion(question);
        setInterviewMessages(prev => [...prev, { role: 'assistant', content: question }]);
        setIsInterviewComplete(complete);
      }

      setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });
    } catch {
      const fallbackQ = 'Alright, let\'s move on. What else?';
      setCurrentQuestion(fallbackQ);
      setInterviewMessages(prev => [...prev, { role: 'assistant', content: fallbackQ }]);
      setDebugInfo({
        provider: 'fireworks',
        model: 'deepseek-v4-flash',
        route: 'api/cv/interview',
        fallback: true,
      });
    } finally {
      setIsAsking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [pendingShortAnswer, interviewMessages, extractedData, cvData.careerGoal]);

  // ─── Generate CV ─────────────────────────────────────────
  const handleGenerateCv = useCallback(async () => {
    setIsGenerating(true);

    try {
      const res = await fetch('/api/cv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: extractedData,
          targetRole: cvData.careerGoal || '',
          template: 'entry-level',
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      const cv = data.cv || {};
      setGeneratedCv(cv);
      setDebugInfo({ ...data.debug, fallback: data.fallback ?? false });

      // Also merge generated data back into cvData for save
      setCvData(prev => mergeExtractedData(prev, cv as Record<string, unknown>));
    } catch {
      // Create minimal fallback CV
      const fallbackCv: Record<string, unknown> = {
        headline: cvData.careerGoal ? `Professional targeting ${cvData.careerGoal}` : 'Professional CV',
        professionalSummary: cvData.professionalSummary || '',
        skills: cvData.skills,
        experience: cvData.experience.map(e => ({
          title: e.role,
          company: e.company,
          duration: e.duration,
          bullets: e.description ? [e.description] : [],
        })),
        education: cvData.education.map(e => ({
          qualification: e.qualification,
          institution: e.institution,
          year: e.year,
        })),
        projects: cvData.projects,
        certifications: cvData.certifications,
        references: cvData.references || 'Available on request',
      };
      setGeneratedCv(fallbackCv);
      setDebugInfo({
        provider: 'fireworks',
        model: 'deepseek-v4-flash',
        route: 'api/cv/generate',
        fallback: true,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [extractedData, cvData]);

  // ─── Generate with what I have ───────────────────────────
  const [showGenerateWarning, setShowGenerateWarning] = useState(false);

  const handleGenerateWithWhatIHave = useCallback(() => {
    if (!interviewComplete) {
      setShowGenerateWarning(true);
    } else {
      handleGenerateCv();
    }
  }, [interviewComplete, handleGenerateCv]);

  const handleConfirmGenerateAnyway = useCallback(() => {
    setShowGenerateWarning(false);
    handleGenerateCv();
  }, [handleGenerateCv]);

  // ─── Download PDF ────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!generatedCv) return;
    try {
      const pdfData = toCvPdfData(generatedCv, cvData);
      const blob = await generateCvPdf(pdfData, 'entry-level');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AetherLink_CV_${cvData.personalDetails.fullName.replace(/\s+/g, '_') || 'draft'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  }, [generatedCv, cvData]);

  // ─── Save to Supabase ────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cv_profiles`;
        await fetch(url, {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal,resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: user.id,
            full_name: cvData.personalDetails.fullName,
            phone: cvData.personalDetails.phone,
            email: cvData.personalDetails.email,
            location: cvData.personalDetails.location,
            career_goal: cvData.careerGoal,
            professional_summary: cvData.professionalSummary,
            headline: cvData.headline,
            skills: cvData.skills,
            education: cvData.education,
            experience: cvData.experience,
            projects: cvData.projects,
            certifications: cvData.certifications,
            references_text: cvData.references,
            cv_strength_score: score,
          }),
        });
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  }, [cvData, score]);

  // ─── Inline editing (post-generation) ────────────────────
  const handleEditSection = useCallback((section: string) => {
    setEditingSection(section);
    if (!generatedCv) return;
    switch (section) {
      case 'headline':
        setEditValue((generatedCv.headline as string) || '');
        break;
      case 'professionalSummary':
        setEditValue((generatedCv.professionalSummary as string) || '');
        break;
      case 'skills':
        setEditValue(
          (Array.isArray(generatedCv.skills) ? generatedCv.skills : [])
            .map(String).join(', ')
        );
        break;
      case 'experience':
        setEditValue(
          (Array.isArray(generatedCv.experience) ? generatedCv.experience : [])
            .map((e: any) => `${e.title || e.role || ''} at ${e.company || ''}: ${(e.bullets || []).join('; ')}`)
            .join('\n')
        );
        break;
      case 'education':
        setEditValue(
          (Array.isArray(generatedCv.education) ? generatedCv.education : [])
            .map((e: any) => `${e.degree || e.qualification || ''} — ${e.institution || ''} ${e.year || ''}`)
            .join('\n')
        );
        break;
      case 'projects':
        setEditValue(
          (Array.isArray(generatedCv.projects) ? generatedCv.projects : [])
            .map((p: any) => `${p.name}: ${p.description}`)
            .join('\n')
        );
        break;
      case 'certifications':
        setEditValue(
          (Array.isArray(generatedCv.certifications) ? generatedCv.certifications : [])
            .map((c: any) => `${c.name} — ${c.issuer || ''} ${c.year || ''}`)
            .join('\n')
        );
        break;
      case 'references':
        setEditValue((generatedCv.references as string) || '');
        break;
      default:
        setEditValue('');
    }
  }, [generatedCv]);

  const handleSaveEdit = useCallback(() => {
    if (!editingSection || !generatedCv) return;
    const updated = { ...generatedCv };

    switch (editingSection) {
      case 'headline':
        updated.headline = editValue.trim();
        break;
      case 'professionalSummary':
        updated.professionalSummary = editValue.trim();
        break;
      case 'skills':
        updated.skills = editValue.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        break;
      case 'experience':
        updated.experience = editValue.split('\n').filter(l => l.trim()).map(line => {
          const parts = line.match(/^(.+?)\s+at\s+(.+?):\s*(.+)/);
          if (parts) {
            return {
              title: parts[1].trim(),
              company: parts[2].trim(),
              bullets: parts[3].split(';').map((b: string) => b.trim()).filter(Boolean),
            };
          }
          return { title: line.trim(), company: '', bullets: [] };
        });
        break;
      case 'education':
        updated.education = editValue.split('\n').filter(l => l.trim()).map(line => {
          const parts = line.split(/[—\-–]/).map(p => p.trim());
          return {
            degree: parts[0] || line.trim(),
            institution: parts[1] || '',
            year: parts[2] || '',
          };
        });
        break;
      case 'projects':
        updated.projects = editValue.split('\n').filter(l => l.trim()).map(line => {
          const parts = line.split(/:\s*/);
          return {
            name: parts[0] || line.trim(),
            description: parts[1] || '',
            technologies: parts[2] || '',
          };
        });
        break;
      case 'certifications':
        updated.certifications = editValue.split('\n').filter(l => l.trim()).map(line => {
          const parts = line.split(/[—\-–]/).map(p => p.trim());
          return {
            name: parts[0] || line.trim(),
            issuer: parts[1] || '',
            year: parts[2] || '',
          };
        });
        break;
      case 'references':
        updated.references = editValue.trim() || 'Available on request';
        break;
    }

    setGeneratedCv(updated);
    setCvData(prev => mergeExtractedData(prev, updated as Record<string, unknown>));
    setEditingSection(null);
    setEditValue('');
  }, [editingSection, editValue, generatedCv]);

  // ─── Key handler ─────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingSection) {
        handleSaveEdit();
      } else {
        handleSend();
      }
    }
  }, [editingSection, handleSend, handleSaveEdit]);

  // ─── Render helper: normalize skill for display ──────────
  const displaySkills = (skills: unknown): string[] => normalizeSkills(skills);

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading your CV journey…</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="font-display text-lg font-bold text-[var(--text-primary)]">CV Journey</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {!hasStarted
              ? 'AI-Assisted CV Builder'
              : generatedCv
                ? 'CV Generated'
                : interviewComplete
                  ? 'Interview Complete'
                  : 'Interview in Progress'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Encouraging strength score ring */}
          <div className="relative flex items-center justify-center group">
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36" aria-label={`CV strength: ${score} out of 100`}>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-elevated)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={score >= 60 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)'}
                strokeWidth="2.5"
                strokeDasharray={`${(score / 100) * 97.4} 97.4`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className={`absolute text-[10px] font-bold ${
              score >= 60 ? 'text-[var(--success)]' :
              score >= 40 ? 'text-[var(--warning)]' :
              'text-[var(--danger)]'
            }`}>{score}</span>
            {/* Tooltip */}
            <div className="absolute top-full mt-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-2 shadow-lg whitespace-nowrap">
              <p className="text-xs font-medium text-[var(--text-primary)]">{scoreMeta.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{score}/100</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="premium-btn premium-btn-secondary text-xs pointer-active"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Main chat / preview area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ─── Welcome screen ─── */}
          {!hasStarted && (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center max-w-md">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)]/10 mb-6">
                  <svg className="h-10 w-10 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
                  AI-Assisted CV Builder
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                  I&apos;ll chat with you one question at a time to understand your background,
                  skills, and goals. Then I&apos;ll whip up a professional CV tailored to your target role.
                </p>
                <button
                  onClick={handleStart}
                  className="premium-btn premium-btn-primary text-base px-8 py-3 pointer-active"
                >
                  Start My CV →
                </button>
              </div>
            </div>
          )}

          {/* ─── Interview mode ─── */}
          {hasStarted && !generatedCv && (
            <>
              {/* AI Draft Preview Card */}
              {draftBullets && draftBullets.length > 0 && (
                <div className="px-4 pt-4">
                  <div className="glass-card p-4 border border-[var(--accent)]/30 bg-[var(--accent)]/5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">✨ AI drafted this</span>
                    </div>

                    {isEditingDraft ? (
                      <textarea
                        className="premium-input w-full min-h-[100px] resize-none text-sm mb-3"
                        value={draftEditText}
                        onChange={(e) => setDraftEditText(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div className="space-y-1 mb-3">
                        {draftBullets.map((bullet, i) => (
                          <p key={i} className="text-sm text-[var(--text-primary)] flex items-start gap-2">
                            <span className="text-[var(--accent)] mt-0.5">•</span>
                            <span>{bullet}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isEditingDraft ? (
                        <>
                          <button
                            onClick={handleSaveDraftEdit}
                            className="premium-btn premium-btn-primary text-xs pointer-active"
                          >
                            Save & Accept
                          </button>
                          <button
                            onClick={() => setIsEditingDraft(false)}
                            className="premium-btn premium-btn-ghost text-xs pointer-active"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleAcceptDraft}
                            className="premium-btn premium-btn-primary text-xs pointer-active"
                          >
                            Accept
                          </button>
                          <button
                            onClick={handleEditDraft}
                            className="premium-btn premium-btn-secondary text-xs pointer-active"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleRegenerateDraft}
                            disabled={isRegeneratingDraft}
                            className="premium-btn premium-btn-ghost text-xs pointer-active"
                          >
                            {isRegeneratingDraft ? 'Regenerating…' : 'Regenerate'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {interviewMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-primary)]'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Short answer prompt */}
              {shortAnswerPrompt !== null && (
                <div className="px-4 py-2">
                  <div className="glass-card p-3 border border-[var(--warning)]/40 bg-[var(--warning)]/5">
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      Could you tell me a bit more about that? Even a sentence or two helps me build a stronger CV section.
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="premium-input flex-1 text-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Add more detail..."
                        autoFocus
                      />
                      <button
                        onClick={handleProceedWithShortAnswer}
                        className="premium-btn premium-btn-ghost text-xs whitespace-nowrap pointer-active"
                      >
                        That&apos;s all I&apos;ve got
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Generate warning modal */}
              {showGenerateWarning && (
                <div className="px-4">
                  <div className="glass-card p-3 border border-[var(--warning)]/40 bg-[var(--warning)]/5 mb-2">
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                      ⚡ Generate with what you have?
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                      The interview isn&apos;t complete yet. Some sections may be thin. You can always regenerate later.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmGenerateAnyway}
                        className="premium-btn premium-btn-primary text-xs pointer-active"
                      >
                        Generate Anyway
                      </button>
                      <button
                        onClick={() => setShowGenerateWarning(false)}
                        className="premium-btn premium-btn-ghost text-xs pointer-active"
                      >
                        Keep Going
                      </button>
                    </div>
                    {missing.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-[var(--text-muted)]">Missing info:</p>
                        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {missing.slice(0, 4).map((m, i) => (
                            <li key={i} className="text-[10px] text-[var(--text-muted)]">• {m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Input area */}
              <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-base)]/80 backdrop-blur-md">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    className="premium-input flex-1 min-h-[44px] max-h-[120px] resize-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isAsking ? 'Waiting for AI response…' : 'Type your answer...'}
                    disabled={isAsking || shortAnswerPrompt !== null}
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isAsking || !input.trim() || shortAnswerPrompt !== null}
                    className="premium-btn premium-btn-primary self-end h-11 w-11 flex items-center justify-center pointer-active disabled:opacity-40"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>

                {/* Generate with what I have button (always visible during interview) */}
                {!isAsking && !draftBullets && interviewMessages.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={handleGenerateWithWhatIHave}
                      disabled={isGenerating}
                      className="w-full premium-btn premium-btn-secondary py-2.5 text-xs pointer-active"
                    >
                      {isGenerating ? '✨ Generating…' : '✨ Generate with what I have'}
                    </button>
                  </div>
                )}

                {/* Original Generate CV button (shown when interview is complete) */}
                {interviewComplete && !isAsking && !draftBullets && (
                  <div className="mt-2">
                    <button
                      onClick={handleGenerateCv}
                      className="w-full premium-btn premium-btn-primary py-3 pointer-active"
                    >
                      ✨ Generate My CV
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── Generated CV preview ─── */}
          {generatedCv && (
            <>
              {/* CV Preview scrollable area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Headline */}
                <div className="glass-card p-4">
                  {editingSection === 'headline' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Professional Headline</label>
                      <input
                        className="premium-input w-full"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{(generatedCv.headline as string) || 'Professional Headline'}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{cvData.personalDetails.fullName || 'Your Name'}</p>
                      </div>
                      <button onClick={() => handleEditSection('headline')} className="text-xs text-[var(--accent)] shrink-0">Edit</button>
                    </div>
                  )}
                </div>

                {/* Professional Summary */}
                <div className="glass-card p-4">
                  {editingSection === 'professionalSummary' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Professional Summary</label>
                      <textarea
                        className="premium-input w-full min-h-[80px] resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Professional Summary</p>
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{(generatedCv.professionalSummary as string) || 'No summary yet.'}</p>
                      </div>
                      <button onClick={() => handleEditSection('professionalSummary')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="glass-card p-4">
                  {editingSection === 'skills' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Skills (comma-separated)</label>
                      <textarea
                        className="premium-input w-full min-h-[60px] resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {displaySkills(generatedCv.skills).map((s, i) => (
                            <span key={i} className="skill-tag">{s}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleEditSection('skills')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>

                {/* Experience */}
                <div className="glass-card p-4">
                  {editingSection === 'experience' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Experience (one per line: Role at Company: bullet1; bullet2)</label>
                      <textarea
                        className="premium-input w-full min-h-[120px] resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Experience</p>
                        {(Array.isArray(generatedCv.experience) ? generatedCv.experience : []).map((exp: any, i: number) => (
                          <div key={i} className="mb-3 last:mb-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{exp.title || exp.role || 'Role'}{exp.company ? ` at ${exp.company}` : ''}</p>
                            {(exp.startDate || exp.endDate || exp.duration) && (
                              <p className="text-xs text-[var(--text-muted)]">{exp.duration || `${exp.startDate || ''} – ${exp.endDate || ''}`}</p>
                            )}
                            {Array.isArray(exp.bullets) && exp.bullets.map((b: string, j: number) => (
                              <p key={j} className="text-xs text-[var(--text-secondary)] mt-0.5">• {b}</p>
                            ))}
                          </div>
                        ))}
                        {(!generatedCv.experience || (Array.isArray(generatedCv.experience) && generatedCv.experience.length === 0)) && (
                          <p className="text-xs text-[var(--text-muted)]">No experience entries.</p>
                        )}
                      </div>
                      <button onClick={() => handleEditSection('experience')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>

                {/* Education */}
                <div className="glass-card p-4">
                  {editingSection === 'education' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Education (one per line: Degree - Institution Year)</label>
                      <textarea
                        className="premium-input w-full min-h-[80px] resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Education</p>
                        {(Array.isArray(generatedCv.education) ? generatedCv.education : []).map((edu: any, i: number) => (
                          <p key={i} className="text-sm text-[var(--text-primary)]">
                            {edu.degree || edu.qualification || ''}
                            {edu.field ? ` in ${edu.field}` : ''}
                            {edu.institution ? ` - ${edu.institution}` : ''}
                            {edu.year ? ` (${edu.year})` : ''}
                          </p>
                        ))}
                        {(!generatedCv.education || (Array.isArray(generatedCv.education) && generatedCv.education.length === 0)) && (
                          <p className="text-xs text-[var(--text-muted)]">No education entries.</p>
                        )}
                      </div>
                      <button onClick={() => handleEditSection('education')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>

                {/* Projects */}
                <div className="glass-card p-4">
                  {editingSection === 'projects' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Projects (one per line: Project Name: Description)</label>
                      <textarea
                        className="premium-input w-full min-h-[80px] resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Projects</p>
                        {(Array.isArray(generatedCv.projects) ? generatedCv.projects : []).map((proj: any, i: number) => (
                          <div key={i} className="mb-2 last:mb-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{proj.name}</p>
                            {proj.description && <p className="text-xs text-[var(--text-secondary)]">{proj.description}</p>}
                            {proj.technologies && <p className="text-xs text-[var(--text-muted)]">Tools: {Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}</p>}
                          </div>
                        ))}
                        {(!generatedCv.projects || (Array.isArray(generatedCv.projects) && generatedCv.projects.length === 0)) && (
                          <p className="text-xs text-[var(--text-muted)]">No projects.</p>
                        )}
                      </div>
                      <button onClick={() => handleEditSection('projects')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>

                {/* Certifications */}
                <div className="glass-card p-4">
                  {editingSection === 'certifications' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">Certifications (one per line: Name - Issuer Year)</label>
                      <textarea
                        className="premium-input w-full min-h-[80px] resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Certifications</p>
                        {(Array.isArray(generatedCv.certifications) ? generatedCv.certifications : []).map((cert: any, i: number) => (
                          <p key={i} className="text-sm text-[var(--text-primary)]">
                            {cert.name}{cert.issuer ? ` - ${cert.issuer}` : ''}{cert.year ? ` (${cert.year})` : ''}
                          </p>
                        ))}
                        {(!generatedCv.certifications || (Array.isArray(generatedCv.certifications) && generatedCv.certifications.length === 0)) && (
                          <p className="text-xs text-[var(--text-muted)]">No certifications.</p>
                        )}
                      </div>
                      <button onClick={() => handleEditSection('certifications')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>

                {/* References */}
                <div className="glass-card p-4">
                  {editingSection === 'references' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">References</label>
                      <input
                        className="premium-input w-full"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-xs pointer-active">Save</button>
                        <button onClick={() => { setEditingSection(null); setEditValue(''); }} className="premium-btn premium-btn-ghost text-xs pointer-active">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">References</p>
                        <p className="text-sm text-[var(--text-primary)]">{(generatedCv.references as string) || 'Available on request'}</p>
                      </div>
                      <button onClick={() => handleEditSection('references')} className="text-xs text-[var(--accent)] shrink-0 ml-2">Edit</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-base)]/80 backdrop-blur-md space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="flex-1 premium-btn premium-btn-primary py-3 pointer-active"
                  >
                    📄 Download PDF
                  </button>
                  <button
                    onClick={handleSave}
                    className="premium-btn premium-btn-secondary py-3 pointer-active"
                  >
                    Save to Profile
                  </button>
                </div>
                <button
                  onClick={() => {
                    setGeneratedCv(null);
                    setIsInterviewComplete(false);
                  }}
                  className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  ← Back to interview
                </button>
              </div>
            </>
          )}
        </div>

        {/* ─── Sidebar — Profile summary ─── */}
        <div className="hidden lg:block w-72 border-l border-[var(--border)] overflow-y-auto p-4 space-y-3 bg-[var(--bg-surface)]">
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">Your Profile</h3>

          {/* Encouraging strength score */}
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-secondary)]">CV Strength</span>
              <span className="text-xs font-semibold" style={{ color: scoreMeta.color }}>
                {scoreMeta.label}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold" style={{ color: scoreMeta.color }}>
                {score}/100
              </span>
              {score < 80 && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {score < 40 ? 'Let\'s improve it together!' : score < 60 ? 'Making good progress!' : 'Almost there!'}
                </span>
              )}
            </div>
            <div className="score-bar h-2 rounded-full overflow-hidden">
              <div
                className={`score-bar-fill ${score >= 60 ? 'high' : score >= 40 ? 'mid' : 'low'}`}
                style={{ '--score-width': `${score}%` } as React.CSSProperties}
              />
            </div>
            {/* What's strong */}
            {strengths.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-medium text-[var(--success)] mb-0.5">✓ What looks good</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {strengths.map((s, i) => (
                    <span key={i} className="text-[10px] text-[var(--text-muted)]">✓ {s}</span>
                  ))}
                </div>
              </div>
            )}
            {/* What's missing — shown in a friendly way */}
            {missing.length > 0 && hasStarted && (
              <div className="mt-1.5">
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">To round things out:</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {missing.slice(0, 4).map((m, i) => (
                    <span key={i} className="text-[10px] text-[var(--text-muted)]">+ {m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI-extracted data sections */}
          {cvData.personalDetails.fullName && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Name</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] mt-1">{cvData.personalDetails.fullName}</p>
              {cvData.personalDetails.email && <p className="text-xs text-[var(--text-muted)]">{cvData.personalDetails.email}</p>}
              {cvData.personalDetails.phone && <p className="text-xs text-[var(--text-muted)]">{cvData.personalDetails.phone}</p>}
              {cvData.personalDetails.location && <p className="text-xs text-[var(--text-muted)]">{cvData.personalDetails.location}</p>}
            </div>
          )}

          {/* Headline */}
          {cvData.headline && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Headline</span>
              <p className="text-sm text-[var(--text-primary)] mt-1">{cvData.headline}</p>
            </div>
          )}

          {cvData.careerGoal && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Target Role</span>
              <p className="text-sm text-[var(--text-primary)] mt-1">{cvData.careerGoal}</p>
            </div>
          )}

          {/* Skills — normalized, never render [object Object] */}
          {displaySkills(cvData.skills).length > 0 && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Skills ({displaySkills(cvData.skills).length})</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {displaySkills(cvData.skills).slice(0, 8).map((s, i) => (
                  <span key={i} className="skill-tag">{s}</span>
                ))}
                {displaySkills(cvData.skills).length > 8 && <span className="text-xs text-[var(--text-muted)]">+{displaySkills(cvData.skills).length - 8} more</span>}
              </div>
            </div>
          )}

          {cvData.experience.length > 0 && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Experience ({cvData.experience.length})</span>
              {cvData.experience.slice(0, 2).map((e, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{e.role}{e.company ? ` at ${e.company}` : ''}</p>
              ))}
            </div>
          )}

          {cvData.education.length > 0 && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Education ({cvData.education.length})</span>
              {cvData.education.slice(0, 2).map((e, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{e.qualification}</p>
              ))}
            </div>
          )}

          {cvData.projects.length > 0 && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Projects ({cvData.projects.length})</span>
              {cvData.projects.slice(0, 2).map((p, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{p.name}</p>
              ))}
            </div>
          )}

          {cvData.certifications.length > 0 && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Certifications ({cvData.certifications.length})</span>
              {cvData.certifications.slice(0, 2).map((c, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{c.name}</p>
              ))}
            </div>
          )}

          {cvData.achievements.length > 0 && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Achievements ({cvData.achievements.length})</span>
              {cvData.achievements.slice(0, 2).map((a, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">• {a}</p>
              ))}
            </div>
          )}

          {cvData.professionalSummary && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Summary</span>
              <p className="text-xs text-[var(--text-primary)] mt-1 line-clamp-3">{cvData.professionalSummary}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Debug Panel (only for devs / ?debug=true) ─── */}
      {showDebug && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur-md">
          <div className="px-4 py-2 text-[0.65rem] text-[var(--text-muted)] font-mono space-y-1">
            {debugInfo ? (
              <>
                <div className="flex gap-4 flex-wrap">
                  <span>Provider: <span className="text-[var(--text-secondary)]">{debugInfo.provider}</span></span>
                  <span>Model: <span className="text-[var(--text-secondary)]">{debugInfo.model}</span></span>
                  <span>Route: <span className="text-[var(--text-secondary)]">{debugInfo.route}</span></span>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <span>Input tokens: <span className="text-[var(--text-secondary)]">{debugInfo.inputTokens ?? '-'}</span></span>
                  <span>Output tokens: <span className="text-[var(--text-secondary)]">{debugInfo.outputTokens ?? '-'}</span></span>
                  <span>Status: <span className={debugInfo.fallback ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>
                    {debugInfo.fallback ? '⚠ Fallback used' : '✓ AI generated'}
                  </span></span>
                </div>
              </>
            ) : (
              <span>No API calls yet.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
