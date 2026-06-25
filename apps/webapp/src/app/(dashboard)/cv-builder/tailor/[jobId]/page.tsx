'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Job, Profile } from '@aetherlink/core';
import { scoreMatch } from '@aetherlink/core';
import { createClient } from '@/lib/supabase/client';

/* ── Typedefs ─────────────────────────────────── */

interface CvBuilderData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  summary: string;
  skills: {
    technical: string[];
    languages: string[];
    softSkills: string[];
  };
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    achievements: string[];
  }>;
  education: Array<{
    institution: string;
    qualification: string;
    year: string;
    honors?: string;
  }>;
  certifications: Array<{
    name: string;
    issuingBody: string;
    year: string;
  }>;
}

interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestedImprovements: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
}

interface TailoredCv {
  summary: string;
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    achievements: string[];
    relevance: 'high' | 'medium' | 'low';
  }>;
  skills: {
    technical: string[];
    languages: string[];
    softSkills: string[];
  };
  education: Array<{
    institution: string;
    qualification: string;
    year: string;
    honors?: string;
  }>;
  certifications: Array<{
    name: string;
    issuingBody: string;
    year: string;
  }>;
  modifications: string[];
}

type Tab = 'original' | 'tailored' | 'comparison';

/* ── Helpers ──────────────────────────────────── */

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(s: string): string[] {
  return normalizeText(s).split(' ').filter(Boolean);
}

function loadCvFromLocalStorage(): CvBuilderData | null {
  try {
    const raw = localStorage.getItem('aetherlink_cv_builder_data');
    if (!raw) return null;
    return JSON.parse(raw) as CvBuilderData;
  } catch {
    return null;
  }
}

function profileToCvBuilderData(profile: Profile): CvBuilderData {
  return {
    fullName: profile.full_name ?? '',
    headline: profile.headline ?? '',
    email: '',
    phone: '',
    summary: profile.headline ?? '',
    skills: {
      technical: profile.skills ?? [],
      languages: [],
      softSkills: [],
    },
    experience: [],
    education: [],
    certifications: (profile.certifications ?? []).map((c) => ({
      name: c,
      issuingBody: '',
      year: '',
    })),
  };
}

function getAllSkills(cv: CvBuilderData): string[] {
  const all: string[] = [];
  for (const s of cv.skills.technical) if (s.trim()) all.push(s.trim());
  for (const s of cv.skills.languages) if (s.trim()) all.push(s.trim());
  for (const s of cv.skills.softSkills) if (s.trim()) all.push(s.trim());
  return [...new Set(all)];
}

function getAllExperienceBullets(cv: CvBuilderData): string[] {
  return cv.experience.flatMap((e) => e.achievements).filter(Boolean);
}

/* ── Comparison Engine ────────────────────────── */

function computeMatch(cv: CvBuilderData, job: Job): MatchResult {
  const cvSkills = getAllSkills(cv);
  const cvBullets = getAllExperienceBullets(cv);
  const cvCertNames = cv.certifications.map((c) => c.name.toLowerCase().trim()).filter(Boolean);
  const cvEdus = cv.education.map((e) => `${e.qualification} ${e.institution}`.toLowerCase().trim()).filter(Boolean);

  const allCvText = [
    cv.summary,
    ...cvSkills,
    ...cvBullets,
    ...cvCertNames,
    ...cvEdus,
    ...cv.experience.map((e) => `${e.role} ${e.company}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const reqTexts = [...(job.requirements ?? []), ...(job.responsibilities ?? [])].filter(Boolean);

  // Use the library scorer for basic score
  let baseScore = 50;
  if (reqTexts.length > 0) {
    const result = scoreMatch(
      reqTexts,
      cvSkills,
      cv.certifications.map((c) => c.name),
      cvBullets,
    );
    baseScore = result.score;
  } else if (cvSkills.length > 0) {
    baseScore = Math.min(100, cvSkills.length * 10);
  }

  // Detailed skill-level matching
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const matchedRequirements: string[] = [];
  const missingRequirements: string[] = [];

  const allReqKeywords = new Set<string>();
  for (const req of reqTexts) {
    const tokens = tokenize(req);
    const matchCount = tokens.filter((t) => allCvText.includes(t)).length;
    const threshold = Math.max(1, Math.ceil(tokens.length * 0.4));

    if (tokens.length === 0 || matchCount >= threshold) {
      matchedRequirements.push(req);
    } else {
      missingRequirements.push(req);
    }

    for (const t of tokens) {
      if (t.length >= 3) allReqKeywords.add(t);
    }
  }

  // Compare individual CV skills vs job text
  const jobText = reqTexts.join(' ').toLowerCase();
  for (const skill of cvSkills) {
    const sn = skill.toLowerCase();
    if (jobText.includes(sn)) {
      matchedSkills.push(skill);
    }
  }

  // Extract missing skills from requirements
  for (const req of reqTexts) {
    const tokens = tokenize(req);
    const matchedInReq = tokens.filter((t) =>
      cvSkills.some((s) => s.toLowerCase().includes(t) || t.includes(s.toLowerCase())),
    );
    if (matchedInReq.length < Math.ceil(tokens.length * 0.3)) {
      // This requirement mentions skills not in CV
      for (const t of tokens) {
        if (t.length >= 4) {
          const hasSkill = cvSkills.some((s) => s.toLowerCase().includes(t));
          const hasCert = cvCertNames.some((c) => c.includes(t));
          if (!hasSkill && !hasCert && !missingSkills.includes(t)) {
            missingSkills.push(t);
          }
        }
      }
    }
  }

  // Generate suggestions
  const suggestions: string[] = [];

  if (missingSkills.length > 0) {
    const topSkills = missingSkills.slice(0, 5);
    suggestions.push(
      `Add experience with: ${topSkills.join(', ')}`,
    );
  }

  if (missingRequirements.length > 0) {
    const topMissing = missingRequirements.slice(0, 3);
    suggestions.push(
      `Address these requirements in your CV: ${topMissing.map((r) => `"${r.substring(0, 60)}"`).join(', ')}`,
    );
  }

  if (cv.certifications.length === 0 && reqTexts.some((r) => /certif|license|credential/i.test(r))) {
    suggestions.push('Consider adding relevant certifications - the job mentions certification/licensing requirements');
  }

  if (cv.education.length === 0) {
    suggestions.push('Add your education details to strengthen your application');
  }

  // Match score: blend library score with skill match rate
  const skillMatchRate = matchedSkills.length / Math.max(cvSkills.length, 1);
  const blendedScore = Math.round(
    baseScore * 0.7 + skillMatchRate * 30,
  );

  return {
    score: Math.min(100, Math.max(0, blendedScore)),
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)],
    suggestedImprovements: suggestions,
    matchedRequirements,
    missingRequirements,
  };
}

/* ── Tailored CV Generator ────────────────────── */

function generateTailoredCv(cv: CvBuilderData, job: Job, match: MatchResult): TailoredCv {
  const jobText =
    [job.title, job.summary, ...(job.requirements ?? []), ...(job.responsibilities ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  const modifications: string[] = [];

  // 1. Score experience entries by relevance
  const scoredExperience = cv.experience.map((exp) => {
    const expText = `${exp.role} ${exp.company} ${exp.achievements.join(' ')}`.toLowerCase();
    const relevanceScore = tokenize(expText).filter((t) => jobText.includes(t)).length;
    return { ...exp, relevanceScore };
  });

  // Sort by relevance (descending)
  scoredExperience.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const tailoredExperience = scoredExperience.map((exp) => {
    const relevance: 'high' | 'medium' | 'low' =
      exp.relevanceScore > 5 ? 'high' : exp.relevanceScore > 2 ? 'medium' : 'low';
    return {
      role: exp.role,
      company: exp.company,
      duration: exp.duration,
      achievements: exp.achievements,
      relevance,
    };
  });

  if (tailoredExperience.length > 0) {
    const reorderedCount = tailoredExperience.filter((e, i) => {
      const origIdx = cv.experience.findIndex((o) => o.role === e.role && o.company === e.company);
      return origIdx >= 0 && origIdx !== i;
    }).length;
    if (reorderedCount > 0) {
      modifications.push(`Reordered ${reorderedCount} experience entr${reorderedCount === 1 ? 'y' : 'ies'} by relevance to this job`);
    }
  }

  // 2. Sort skills — matching skills first
  const allSkills: Array<{ skill: string; cat: 'technical' | 'languages' | 'softSkills' }> = [];
  for (const s of cv.skills.technical) allSkills.push({ skill: s, cat: 'technical' });
  for (const s of cv.skills.languages) allSkills.push({ skill: s, cat: 'languages' });
  for (const s of cv.skills.softSkills) allSkills.push({ skill: s, cat: 'softSkills' });

  const matchSet = new Set(match.matchedSkills.map((s) => s.toLowerCase()));
  allSkills.sort((a, b) => {
    const aMatch = matchSet.has(a.skill.toLowerCase()) ? 1 : 0;
    const bMatch = matchSet.has(b.skill.toLowerCase()) ? 1 : 0;
    return bMatch - aMatch;
  });

  const tailoredSkills: TailoredCv['skills'] = {
    technical: allSkills.filter((s) => s.cat === 'technical').map((s) => s.skill),
    languages: allSkills.filter((s) => s.cat === 'languages').map((s) => s.skill),
    softSkills: allSkills.filter((s) => s.cat === 'softSkills').map((s) => s.skill),
  };

  const matchedSkillCount = allSkills.filter((s) => matchSet.has(s.skill.toLowerCase())).length;
  if (matchedSkillCount > 0) {
    modifications.push(`Emphasized ${matchedSkillCount} skill${matchedSkillCount === 1 ? '' : 's'} matching job requirements`);
  }

  // 3. Generate job-tailored summary
  const jobKeywords = [...new Set(tokenize(jobText).filter((t) => t.length >= 4))];
  const cvKeywords = [...new Set([cv.summary, ...getAllSkills(cv)].join(' ').toLowerCase().split(' '))];
  const overlap = jobKeywords.filter((t) => cvKeywords.includes(t));

  let tailoredSummary = cv.summary || cv.headline || `${cv.fullName} - Professional`;
  if (cv.summary && overlap.length > 2) {
    tailoredSummary = cv.summary;
  } else if (cv.headline) {
    // Enrich headline with matching job keywords
    const extra = overlap.slice(0, 3).join(', ');
    tailoredSummary = extra
      ? `${cv.headline} - Skilled in ${extra}`
      : cv.headline;
  }

  if (tailoredSummary !== (cv.summary || cv.headline)) {
    modifications.push('Adjusted professional summary to align with this job description');
  }

  return {
    summary: tailoredSummary,
    experience: tailoredExperience,
    skills: tailoredSkills,
    education: cv.education,
    certifications: cv.certifications,
    modifications,
  };
}

/* ── PDF Generation (window.print approach) ──── */

function generatePdfHtml(
  cv: CvBuilderData,
  tailored: TailoredCv,
  job: Job,
): string {
  const allSkills = [...tailored.skills.technical, ...tailored.skills.languages, ...tailored.skills.softSkills];
  const style = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
      padding: 0.75in 0.5in;
    }
    h1 { font-size: 18pt; margin-bottom: 2pt; }
    h2 {
      font-size: 12pt;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3pt;
      margin-top: 14pt;
      margin-bottom: 6pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    .headline { font-size: 11pt; color: #444; margin-bottom: 4pt; }
    .contact { font-size: 10pt; color: #555; margin-bottom: 8pt; }
    .job-header { font-size: 10pt; color: #666; margin-bottom: 10pt; }
    .entry { margin-bottom: 8pt; }
    .entry-title { font-weight: bold; font-size: 11pt; }
    .entry-sub { font-size: 10pt; color: #555; }
    .entry-dates { font-size: 10pt; color: #666; float: right; }
    ul { margin-left: 16pt; margin-top: 3pt; }
    li { margin-bottom: 2pt; font-size: 10pt; }
    .skill-group { margin-bottom: 6pt; }
    .skill-label { font-weight: bold; font-size: 10pt; }
    .skill-items { font-size: 10pt; color: #333; }
    .summary-text { font-size: 10.5pt; margin-bottom: 8pt; line-height: 1.4; }
    .ats-note { font-size: 8pt; color: #999; margin-top: 20pt; border-top: 1px solid #eee; padding-top: 6pt; }
    .badge { display: inline-block; font-size: 8pt; background: #e8e8ff; color: #4444cc; padding: 1pt 5pt; border-radius: 3pt; margin-right: 3pt; }
  `;

  const skillsHtml = allSkills.length > 0
    ? `<h2>Skills</h2>
       ${tailored.skills.technical.length > 0 ? `<div class="skill-group"><span class="skill-label">Technical: </span><span class="skill-items">${tailored.skills.technical.join(', ')}</span></div>` : ''}
       ${tailored.skills.languages.length > 0 ? `<div class="skill-group"><span class="skill-label">Languages: </span><span class="skill-items">${tailored.skills.languages.join(', ')}</span></div>` : ''}
       ${tailored.skills.softSkills.length > 0 ? `<div class="skill-group"><span class="skill-label">Soft Skills: </span><span class="skill-items">${tailored.skills.softSkills.join(', ')}</span></div>` : ''}`
    : '';

  const expHtml = tailored.experience.length > 0
    ? `<h2>Experience</h2>
       ${tailored.experience.map((e) => `
         <div class="entry">
           <div class="entry-title">${e.role} <span style="font-weight:normal">at ${e.company}</span></div>
           <div class="entry-sub">${e.duration}</div>
           ${e.achievements.length > 0 ? `<ul>${e.achievements.map((a) => `<li>${a}</li>`).join('')}</ul>` : ''}
         </div>
       `).join('')}`
    : '';

  const eduHtml = tailored.education.length > 0
    ? `<h2>Education</h2>
       ${tailored.education.map((e) => `
         <div class="entry">
           <div class="entry-title">${e.qualification}</div>
           <div class="entry-sub">${e.institution}${e.honors ? ` - ${e.honors}` : ''}</div>
           <div class="entry-dates">${e.year}</div>
         </div>
       `).join('')}`
    : '';

  const certHtml = tailored.certifications.length > 0
    ? `<h2>Certifications</h2>
       ${tailored.certifications.map((c) => `
         <div class="entry">
           <div class="entry-title">${c.name}</div>
           <div class="entry-sub">${c.issuingBody ? `${c.issuingBody}${c.year ? ` - ${c.year}` : ''}` : c.year || ''}</div>
         </div>
       `).join('')}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${cv.fullName || 'CV'} — Tailored for ${job.title}</title>
  <style>${style}</style>
</head>
<body>
  <h1>${cv.fullName || ''}</h1>
  ${cv.headline ? `<div class="headline">${tailored.summary}</div>` : ''}
  ${cv.email || cv.phone ? `<div class="contact">${[cv.email, cv.phone].filter(Boolean).join(' · ')}</div>` : ''}
  <div class="job-header">Tailored CV for <strong>${job.title}</strong> at ${job.companyName || 'Employer'}</div>

  ${skillsHtml}
  ${expHtml}
  ${eduHtml}
  ${certHtml}

  <div class="ats-note">ATS-friendly CV - Tailored for ${job.title} at ${job.companyName || 'Employer'}.</div>
</body>
</html>`;
}

function downloadPdf(cv: CvBuilderData, tailored: TailoredCv, job: Job) {
  const html = generatePdfHtml(cv, tailored, job);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  // Delay print to let styles render
  setTimeout(() => win.print(), 400);
}

/* ── UI Components ────────────────────────────── */

function ScoreCircle({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setOffset(circumference - (score / 100) * circumference);
    });
    return () => cancelAnimationFrame(t);
  }, [score, circumference]);

  const barColor: 'high' | 'mid' | 'low' =
    score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  const barTrackColor =
    score >= 70
      ? 'var(--match-high)'
      : score >= 40
        ? 'var(--match-mid)'
        : 'var(--match-low)';
  const label =
    score >= 70
      ? 'Strong match'
      : score >= 40
        ? 'Good match'
        : 'Low match';

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`${score}% match: ${label}`}>
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-ring-circle"
            style={{ '--score-color': barTrackColor } as React.CSSProperties}
          />
        </svg>
        <span className="absolute font-display text-2xl font-bold text-[var(--text-primary)] animate-fade-in">
          {score}%
        </span>
      </div>
      <span
        className={`text-xs font-medium ${
          barColor === 'high'
            ? 'text-[var(--match-high)]'
            : barColor === 'mid'
              ? 'text-[var(--match-mid)]'
              : 'text-[var(--match-low)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'bg-[var(--accent-btn)] text-white shadow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'
      }`}
    >
      {children}
    </button>
  );
}

function SkillBadge({
  label,
  matched,
}: {
  label: string;
  matched?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        matched === true
          ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30'
          : matched === false
            ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30'
            : 'bg-[var(--accent-glow)] text-[var(--accent-hover)] border border-[var(--border-accent)]'
      }`}
    >
      {matched === true && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {matched === false && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {label}
    </span>
  );
}

/* ── Main Page ────────────────────────────────── */

export default function CvTailorPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const jobIdNum = Number(jobId);
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const supabase = createClient();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [cv, setCv] = useState<CvBuilderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('original');
  const [saving, setSaving] = useState(false);

  // Derived state
  const match = cv && job ? computeMatch(cv, job) : null;
  const tailored = cv && job && match ? generateTailoredCv(cv, job, match) : null;

  useEffect(() => {
    void (async () => {
      try {
        const isDebug = window.location.search.includes('debug=true');
        let j: Job | null = null;
        let cvData: CvBuilderData | null = null;

        // 1. Load job
        if (isDebug) {
          const feed = await sdk.listFeedJobs({ limit: 50 });
          j = feed.jobs.find((f) => f.id === jobIdNum) ?? null;
        } else {
          j = await sdk.getFeedJob(jobIdNum);
        }

        if (!j) {
          setError('Job not found');
          setLoading(false);
          return;
        }
        setJob(j);

        // 2. Load CV — try localStorage first, then Supabase
        cvData = loadCvFromLocalStorage();

        if (!cvData) {
          // Try cv_profiles table in Supabase
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const db = supabase as unknown as { from: (t: string) => { select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } } } };
              const { data: cvProfile, error: cvError } = await db
                .from('cv_profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

              if (!cvError && cvProfile) {
                const parsed = cvProfile as { data?: CvBuilderData };
                if (parsed.data) {
                  cvData = parsed.data;
                }
              }
            }
          } catch {
            // cv_profiles table may not exist yet — that's OK
          }
        }

        if (!cvData) {
          // Fallback: try profile
          const prof = await sdk.getAetherLinkProfile();
          if (prof) {
            cvData = profileToCvBuilderData(prof);
          }
        }

        if (!cvData) {
          setError('No CV data found. Please create a CV first.');
          setLoading(false);
          return;
        }
        setCv(cvData);
      } catch (e) {
        console.error('CV tailor load error:', e);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobIdNum, sdk, supabase]);

  const handleDownloadPdf = useCallback(() => {
    if (cv && tailored && job) {
      downloadPdf(cv, tailored, job);
    }
  }, [cv, tailored, job]);

  const handleSaveTailored = useCallback(() => {
    if (!tailored || !cv || !job) return;
    setSaving(true);
    try {
      const savedData = {
        original: cv,
        tailored,
        job: { id: job.id, title: job.title, companyName: job.companyName },
        tailoredAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem('aetherlink_cv_tailored_versions') || '[]');
      existing.unshift(savedData);
      localStorage.setItem('aetherlink_cv_tailored_versions', JSON.stringify(existing.slice(0, 20)));
      // Also save the tailored data as the active CV for this job
      localStorage.setItem(`aetherlink_cv_tailored_${job.id}`, JSON.stringify(savedData));

      // Use a toast-like notification
      const btn = document.getElementById('save-tailored-btn');
      if (btn) {
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = 'Save as tailored version'; }, 2000);
      }
    } catch (e) {
      console.error('Save tailored error:', e);
    } finally {
      setSaving(false);
    }
  }, [tailored, cv, job]);

  const handleSaveToProfile = useCallback(async () => {
    if (!cv || !job) return;
    setSaving(true);
    try {
      await sdk.updateAetherLinkProfile({
        skills: getAllSkills(cv),
        certifications: cv.certifications.map((c) => c.name),
        headline: cv.headline,
        full_name: cv.fullName,
      });
      const btn = document.getElementById('save-profile-btn') as HTMLButtonElement | null;
      if (btn) {
        btn.textContent = '✓ Saved to profile!';
        setTimeout(() => { btn.textContent = 'Save skills to profile'; }, 2000);
      }
    } catch (e) {
      console.error('Save profile error:', e);
    } finally {
      setSaving(false);
    }
  }, [cv, job, sdk]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Sticky header skeleton */}
        <div className="sticky top-0 z-20 bg-[var(--bg-base)]/80 backdrop-blur-md py-3 border-b border-[var(--border)] -mx-4 px-4">
          <div className="h-6 w-48 skeleton rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-32 skeleton rounded-lg" />
            <div className="h-64 skeleton rounded-lg" />
          </div>
          <div className="space-y-4">
            <div className="h-32 skeleton rounded-lg" />
            <div className="h-48 skeleton rounded-lg" />
            <div className="h-48 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !job) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between sticky top-0 z-20 bg-[var(--bg-base)]/80 backdrop-blur-md py-3 border-b border-[var(--border)] -mx-4 px-4">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">CV Tailor</h1>
        </div>
        <div className="glass-card p-8 text-center">
          <div className="empty-state-icon mx-auto">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="font-display text-lg font-bold text-[var(--text-primary)] mt-4">
            {error || 'Job not found'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/feed" className="premium-btn premium-btn-secondary text-sm">
              Back to feed
            </Link>
            <Link href="/cv" className="premium-btn premium-btn-primary text-sm">
              Create CV
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── No CV state ── */
  if (!cv) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between sticky top-0 z-20 bg-[var(--bg-base)]/80 backdrop-blur-md py-3 border-b border-[var(--border)] -mx-4 px-4">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">CV Tailor</h1>
        </div>
        <div className="glass-card p-8 text-center">
          <div className="empty-state-icon mx-auto">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="font-display text-lg font-bold text-[var(--text-primary)] mt-4">
            No CV data found
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">
            You need to create a CV before tailoring it for this job.
          </p>
          <div className="flex justify-center gap-3">
            <Link href={`/feed/${job.id}`} className="premium-btn premium-btn-secondary text-sm">
              Back to job
            </Link>
            <Link href="/cv" className="premium-btn premium-btn-primary text-sm">
              Create CV
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allSkills = getAllSkills(cv);

  return (
    <div className="space-y-6 page-enter">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[var(--bg-base)]/80 backdrop-blur-md py-3 border-b border-[var(--border)] -mx-4 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/feed/${job.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] transition-all shrink-0"
            aria-label="Back to job"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-[var(--text-primary)] truncate">
              CV Tailor
            </h1>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {job.title} at {job.companyName || 'Employer'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {match && (
            <ScoreCircle score={match.score} />
          )}
        </div>
      </div>

      {/* Main grid: Job details (left) vs Comparison (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Job Details ── */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="section-heading mb-3">Job Details</h2>
            <p className="font-display text-xl font-bold text-[var(--text-primary)]">{job.title}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{job.companyName}</p>

            {job.location && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {job.location}
              </div>
            )}

            {(job.employment_type || job.category) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {job.employment_type && (
                  <span className="pill text-xs">{job.employment_type}</span>
                )}
                {job.category && (
                  <span className="pill text-xs">{job.category}</span>
                )}
                {job.tags?.slice(0, 4).map((tag) => (
                  <span key={tag} className="pill text-xs">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Requirements & Responsibilities */}
          {(!!job.requirements?.length || !!job.responsibilities?.length) && (
            <div className="glass-card p-5">
              <h2 className="section-heading mb-3">Key Requirements</h2>
              {job.requirements?.map((req, i) => {
                const isMatched = match?.matchedRequirements.includes(req);
                const isMissing = match?.missingRequirements.includes(req);
                return (
                  <div
                    key={`req-${i}`}
                    className={`flex items-start gap-2 py-1.5 text-sm border-b border-[var(--border)] last:border-0 ${
                      isMatched ? 'text-[var(--success)]' : isMissing ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isMatched ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : isMissing ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      )}
                    </span>
                    <span>{req}</span>
                  </div>
                );
              })}
              {job.responsibilities?.map((resp, i) => (
                <div
                  key={`resp-${i}`}
                  className="flex items-start gap-2 py-1.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border)] last:border-0"
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{resp}</span>
                </div>
              ))}
            </div>
          )}

          {/* Job summary */}
          {job.summary && (
            <div className="glass-card p-5">
              <h2 className="section-heading mb-2">About the role</h2>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{job.summary}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Comparison ── */}
        <div className="space-y-4">
          {/* Tab navigation */}
          <div className="flex items-center gap-1 p-1 bg-[var(--glass-bg-subtle)] rounded-xl border border-[var(--border)]">
            <TabButton active={activeTab === 'original'} onClick={() => setActiveTab('original')}>
              Original CV
            </TabButton>
            <TabButton active={activeTab === 'tailored'} onClick={() => setActiveTab('tailored')}>
              Tailored CV
            </TabButton>
            <TabButton active={activeTab === 'comparison'} onClick={() => setActiveTab('comparison')}>
              Comparison
            </TabButton>
          </div>

          {/* ── Tab: Original CV ── */}
          {activeTab === 'original' && (
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <h2 className="section-heading">Original CV</h2>

              {cv.fullName && (
                <div>
                  <p className="font-display text-lg font-bold text-[var(--text-primary)]">{cv.fullName}</p>
                  {cv.headline && (
                    <p className="text-sm text-[var(--text-secondary)]">{cv.headline}</p>
                  )}
                </div>
              )}

              {allSkills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {allSkills.map((s) => (
                      <SkillBadge key={s} label={s} matched={match?.matchedSkills.includes(s)} />
                    ))}
                  </div>
                </div>
              )}

              {cv.experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Experience</h3>
                  {cv.experience.map((exp, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{exp.role}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{exp.company} &middot; {exp.duration}</p>
                      {exp.achievements.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {exp.achievements.map((a, j) => (
                            <li key={j} className="text-xs text-[var(--text-muted)] flex items-start gap-1.5">
                              <span className="mt-1 h-1 w-1 rounded-full bg-[var(--text-muted)] shrink-0" aria-hidden="true" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {cv.education.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Education</h3>
                  {cv.education.map((edu, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{edu.qualification}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {edu.institution}{edu.honors ? ` - ${edu.honors}` : ''}{edu.year ? ` (${edu.year})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {cv.certifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Certifications</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.certifications.map((c, i) => (
                      <span key={i} className="skill-tag text-xs">{c.name}{c.issuingBody ? ` - ${c.issuingBody}` : ''}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Tailored CV ── */}
          {activeTab === 'tailored' && tailored && (
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="section-heading mb-0">Tailored CV</h2>
                {tailored.modifications.length > 0 && (
                  <span className="badge badge-high text-[10px]">
                    {tailored.modifications.length} change{tailored.modifications.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Modifications summary */}
              {tailored.modifications.length > 0 && (
                <div className="bg-[var(--accent-glow)]/30 border border-[var(--border-accent)] rounded-lg p-3">
                  <p className="text-xs font-semibold text-[var(--accent-hover)] mb-1.5">Changes made</p>
                  <ul className="space-y-1">
                    {tailored.modifications.map((m, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5">
                        <svg className="w-3 h-3 mt-0.5 shrink-0 text-[var(--accent-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="font-display text-lg font-bold text-[var(--text-primary)]">{cv.fullName}</p>
                <p className="text-sm text-[var(--accent-hover)]">{tailored.summary}</p>
              </div>

              {/* Skills (matching first) */}
              {(() => {
                const tech = tailored.skills.technical;
                const langs = tailored.skills.languages;
                const soft = tailored.skills.softSkills;
                const all = [...tech, ...langs, ...soft];
                return all.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {all.map((s) => {
                        const isMatched = match?.matchedSkills.includes(s);
                        return (
                          <span
                            key={s}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              isMatched
                                ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30 ring-1 ring-[var(--success)]/20'
                                : 'bg-[var(--glass-bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'
                            }`}
                          >
                            {isMatched && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Experience (reordered by relevance) */}
              {tailored.experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Experience
                    <span className="ml-2 text-[10px] font-normal text-[var(--text-muted)]">(ordered by relevance)</span>
                  </h3>
                  {tailored.experience.map((exp, i) => (
                    <div
                      key={i}
                      className={`mb-3 p-3 rounded-lg last:mb-0 ${
                        exp.relevance === 'high'
                          ? 'bg-[var(--success-bg)]/20 border border-[var(--success)]/20'
                          : exp.relevance === 'medium'
                            ? 'bg-[var(--glass-bg-subtle)] border border-[var(--border)]'
                            : 'bg-[var(--glass-bg-subtle)] border border-[var(--border)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{exp.role}</p>
                        {exp.relevance === 'high' && (
                          <span className="badge badge-high text-[9px]">Highly relevant</span>
                        )}
                        {exp.relevance === 'medium' && (
                          <span className="badge badge-mid text-[9px]">Somewhat relevant</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{exp.company} &middot; {exp.duration}</p>
                      {exp.achievements.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {exp.achievements.map((a, j) => (
                            <li key={j} className="text-xs text-[var(--text-muted)] flex items-start gap-1.5">
                              <span className="mt-1 h-1 w-1 rounded-full bg-[var(--text-muted)] shrink-0" aria-hidden="true" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {tailored.education.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Education</h3>
                  {tailored.education.map((edu, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{edu.qualification}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {tailored.certifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Certifications</h3>
                  {tailored.certifications.map((c, i) => (
                    <div key={i} className="mb-1.5 last:mb-0">
                      <p className="text-sm text-[var(--text-primary)]">{c.name}</p>
                      {c.issuingBody && <p className="text-xs text-[var(--text-secondary)]">{c.issuingBody}{c.year ? ` · ${c.year}` : ''}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="premium-btn premium-btn-primary flex-1 justify-center pointer-active"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Tailored CV (PDF)
                </button>
                <button
                  id="save-tailored-btn"
                  type="button"
                  onClick={handleSaveTailored}
                  disabled={saving}
                  className="premium-btn premium-btn-secondary flex-1 justify-center pointer-active disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save as tailored version'}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Comparison ── */}
          {activeTab === 'comparison' && match && (
            <div className="space-y-4 animate-fade-in">
              {/* Match Score & Summary */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="section-heading mb-1">Match Analysis</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {match.matchedSkills.length} skills matched &middot; {match.missingSkills.length} gaps found
                    </p>
                  </div>
                  <ScoreCircle score={match.score} />
                </div>

                {/* Score bar */}
                <div className="mt-4 score-bar overflow-hidden rounded-full">
                  <div
                    className={`score-bar-fill ${
                      match.score >= 70 ? 'high' : match.score >= 40 ? 'mid' : 'low'
                    }`}
                    style={{ '--score-width': `${match.score}%` } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Matched Skills */}
              {match.matchedSkills.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Matched Skills ({match.matchedSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matchedSkills.map((s) => (
                      <SkillBadge key={s} label={s} matched={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {match.missingSkills.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Missing Skills & Gaps ({match.missingSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missingSkills.map((s) => (
                      <SkillBadge key={s} label={s} matched={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Improvements */}
              {match.suggestedImprovements.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                    Suggested Improvements
                  </h3>
                  <ul className="space-y-2">
                    {match.suggestedImprovements.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--glass-bg-subtle)] border border-[var(--border)]"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-btn)] text-white text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[var(--text-primary)]">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements breakdown */}
              {match.missingRequirements.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Requirements to Address
                  </h3>
                  <div className="space-y-2">
                    {match.missingRequirements.slice(0, 5).map((req, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[var(--warning)]">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span>{req}</span>
                      </div>
                    ))}
                    {match.missingRequirements.length > 5 && (
                      <p className="text-xs text-[var(--text-muted)] pl-6">
                        +{match.missingRequirements.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Save to profile button */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="premium-btn premium-btn-primary flex-1 justify-center pointer-active"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Tailored CV (PDF)
                </button>
                <button
                  id="save-profile-btn"
                  type="button"
                  onClick={handleSaveToProfile}
                  disabled={saving}
                  className="premium-btn premium-btn-secondary flex-1 justify-center pointer-active disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save skills to profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
