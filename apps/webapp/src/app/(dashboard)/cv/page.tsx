'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Profile, Job } from '@aetherlink/core';
import { createClient } from '@/lib/supabase/client';
import { computeLegacyMatchScore, computeMatchScore } from '@/lib/scoring';

type CvSection = 'personal' | 'experience' | 'skills' | 'education' | 'certifications';

type ExperienceEntry = { role: string; company: string; duration: string };
type EducationEntry = { institution: string; qualification: string; year: string };

function computeCvScore(profile: Profile): number {
  let score = 0;
  if (profile.full_name && profile.full_name.trim().length > 2) score += 15;
  if (profile.headline && profile.headline.trim().length > 3) score += 15;
  if (profile.skills && profile.skills.length > 0) score += 20;
  if (profile.skills && profile.skills.length > 3) score += 10;
  if (profile.certifications && profile.certifications.length > 0) score += 10;
  return Math.min(100, score);
}

function CvScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setOffset(circumference - (score / 100) * circumference);
    });
    return () => cancelAnimationFrame(t);
  }, [score, circumference]);

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring-circle"
        />
      </svg>
      <span className="absolute font-display text-2xl font-bold text-[var(--text-primary)] animate-fade-in">{score}</span>
    </div>
  );
}

function ExperienceForm({
  onAdd,
  onCancel,
}: {
  onAdd: (entry: ExperienceEntry) => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [duration, setDuration] = useState('');

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
      <input
        className="premium-input"
        placeholder="Role / title"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <input
        className="premium-input"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        className="premium-input"
        placeholder="Duration (e.g. 2 years)"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAdd({ role, company, duration })}
          disabled={!role.trim()}
          className="premium-btn premium-btn-primary disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="premium-btn premium-btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EducationForm({
  onAdd,
  onCancel,
}: {
  onAdd: (entry: EducationEntry) => void;
  onCancel: () => void;
}) {
  const [institution, setInstitution] = useState('');
  const [qualification, setQualification] = useState('');
  const [year, setYear] = useState('');

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
      <input
        className="premium-input"
        placeholder="Institution"
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
      />
      <input
        className="premium-input"
        placeholder="Qualification (e.g. BSc Computer Science)"
        value={qualification}
        onChange={(e) => setQualification(e.target.value)}
      />
      <input
        className="premium-input"
        placeholder="Year (e.g. 2022)"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAdd({ institution, qualification, year })}
          disabled={!qualification.trim()}
          className="premium-btn premium-btn-primary disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="premium-btn premium-btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AccordionCard({
  title,
  open,
  onToggle,
  children,
  hasContent,
  preview,
  icon,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasContent?: boolean;
  preview?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="accordion-header flex w-full items-center justify-between p-5 text-left transition hover:bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      >
        <span className="flex items-center gap-3 min-w-0">
          {hasContent ? (
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shrink-0" aria-hidden="true" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)] shrink-0" aria-hidden="true" />
          )}
          {icon && <span className="shrink-0 text-[var(--text-muted)]">{icon}</span>}
          <span className="font-display text-base font-bold text-[var(--text-primary)]">{title}</span>
          {preview && (
            <span className="ml-2 truncate text-xs text-[var(--text-muted)] hidden sm:inline">{preview}</span>
          )}
        </span>
        <svg
          className={`accordion-chevron h-5 w-5 shrink-0 ${open ? 'open' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
}

export default function CVPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<CvSection | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [editSection, setEditSection] = useState<CvSection | null>(null);

  useEffect(() => {
    void (async () => {
      const isDebug = window.location.search.includes('debug=true');
      try {
        let prof, feed;
        if (isDebug) {
          [prof, feed] = await Promise.all([
            sdk.getAetherLinkProfile(),
            sdk.listFeedJobs({ limit: 50 }),
          ]);
        } else {
          const { data } = await supabase.auth.getUser();
          if (!data?.user) { router.push('/'); return; }
          [prof, feed] = await Promise.all([
            sdk.getAetherLinkProfile(),
            sdk.listFeedJobs({ limit: 50 }),
          ]);
        }
        setProfile(prof ?? null);
        setJobs(feed.jobs);
        if (prof) {
          setFullName(prof.full_name ?? '');
          setHeadline(prof.headline ?? '');
          setSkills(prof.skills ?? []);
          setCertifications(prof.certifications ?? []);
        }
      } catch (e) {
        console.error('CV load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk, supabase, router]);

  const cvScore = computeCvScore(profile ?? {} as Profile);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await sdk.updateAetherLinkProfile({
        full_name: fullName,
        headline,
        skills,
        certifications,
      });
      setProfile(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  }

  function addCert() {
    const trimmed = certInput.trim();
    if (trimmed && !certifications.includes(trimmed)) {
      setCertifications((prev) => [...prev, trimmed]);
    }
    setCertInput('');
  }

  const matchedJobs = jobs
    .map((j) => { 
      const hasStructuredContent = j.requirements?.length || j.responsibilities?.length;
      let score = 0;
      if (hasStructuredContent && j.parser_version === 2) {
        const structuredScore = computeMatchScore(
          j.requirements ?? [],
          skills,
          profile?.certifications ?? [],
          [],
        );
        score = structuredScore ?? 0;
      } else {
        score = computeLegacyMatchScore(j.title, j.description, skills);
      }
      return { ...j, score };
    })
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading your CV…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header with save button */}
      <div className="flex items-center justify-between sticky top-0 z-20 bg-[var(--bg-base)]/80 backdrop-blur-md py-3 border-b border-[var(--border)] -mx-1 px-1">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">My CV</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="premium-btn premium-btn-secondary text-sm disabled:opacity-50 pointer-active"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Score card */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-5">
          <CvScoreRing score={cvScore} />
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">
              CV Strength
              <span className="sr-only">: {cvScore} out of 100</span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {cvScore < 40
                ? 'Add your details to improve your match score.'
                : cvScore < 70
                ? 'Good start! Add more skills to stand out.'
                : 'Great profile! You are ready to apply.'}
            </p>
            {/* Progress bar */}
            <div className="mt-3 score-bar overflow-hidden rounded-full">
              <div className={`score-bar-fill ${cvScore >= 70 ? 'high' : cvScore >= 40 ? 'mid' : 'low'}`} style={{ '--score-width': `${cvScore}%` } as React.CSSProperties} />
            </div>
          </div>
        </div>
        {/* Actionable checklist */}
        {cvScore < 90 && (
          <div className="mt-4 glass-card p-4">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">✅ Complete your profile</p>
            <ul className="space-y-1.5 text-xs">
              <li className={`flex items-center gap-2 ${fullName ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px]">
                  {fullName ? '✓' : '○'}
                </span>
                {fullName ? 'Name added' : 'Add your name'}
              </li>
              <li className={`flex items-center gap-2 ${headline ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px]">
                  {headline ? '✓' : '○'}
                </span>
                {headline ? 'Headline added' : 'Add a professional headline'}
              </li>
              <li className={`flex items-center gap-2 ${skills.length > 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px]">
                  {skills.length > 0 ? '✓' : '○'}
                </span>
                {skills.length > 0 ? `${skills.length} skill(s) added` : 'Add relevant skills'}
                {skills.length > 0 && skills.length <= 3 && <span className="text-[var(--text-secondary)] ml-1">(aim for 5+)</span>}
              </li>
              <li className={`flex items-center gap-2 ${experience.length > 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px]">
                  {experience.length > 0 ? '✓' : '○'}
                </span>
                {experience.length > 0 ? `${experience.length} experience(s) added` : 'Add work experience'}
              </li>
              <li className={`flex items-center gap-2 ${education.length > 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px]">
                  {education.length > 0 ? '✓' : '○'}
                </span>
                {education.length > 0 ? `${education.length} education(s) added` : 'Add education details'}
              </li>
              <li className={`flex items-center gap-2 ${certifications.length > 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px]">
                  {certifications.length > 0 ? '✓' : '○'}
                </span>
                {certifications.length > 0 ? `${certifications.length} certification(s) added` : 'Add certifications'}
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Accordion sections */}
      <div className="space-y-2">
        <AccordionCard
          title="Personal Info"
          open={openSection === 'personal'}
          onToggle={() => setOpenSection(openSection === 'personal' ? null : 'personal')}
          hasContent={!!fullName || !!headline}
          preview={fullName ? `${fullName}${headline ? ' — ' + headline : ''}` : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Full name</label>
              <input
                className="premium-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Headline</label>
              <input
                className="premium-input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>
          </div>
        </AccordionCard>

        <AccordionCard
          title="Experience"
          open={openSection === 'experience'}
          onToggle={() => setOpenSection(openSection === 'experience' ? null : 'experience')}
          hasContent={experience.length > 0}
          preview={experience.length > 0 ? `${experience.length} ${experience.length === 1 ? 'entry' : 'entries'}` : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          }
        >
          {experience.length === 0 && editSection !== 'experience' && (
            <p className="text-sm text-[var(--text-muted)]">No experience added yet.</p>
          )}
          {experience.map((exp, idx) => (
            <div key={idx} className="mb-3 glass-card p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{exp.role || 'Untitled role'}</p>
              <p className="text-xs text-[var(--text-secondary)]">{exp.company} &middot; {exp.duration}</p>
              <button
                type="button"
                onClick={() => setExperience((prev) => prev.filter((_, i) => i !== idx))}
                className="mt-1 text-xs text-[var(--danger)] hover:underline pointer-active"
              >
                Remove
              </button>
            </div>
          ))}
          {editSection === 'experience' ? (
            <ExperienceForm
              onAdd={(entry) => { setExperience((prev) => [...prev, entry]); setEditSection(null); }}
              onCancel={() => setEditSection(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditSection('experience')}
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              + Add experience
            </button>
          )}
        </AccordionCard>

        <AccordionCard
          title="Skills"
          open={openSection === 'skills'}
          onToggle={() => setOpenSection(openSection === 'skills' ? null : 'skills')}
          hasContent={skills.length > 0}
          preview={skills.length > 0 ? skills.slice(0, 3).join(', ') + (skills.length > 3 ? ` +${skills.length - 3} more` : '') : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="skill-tag">
                  {s}
                  <button
                    type="button"
                    className="skill-tag-remove"
                    onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="premium-input flex-1"
                placeholder="Add a skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                onClick={addSkill}
                className="premium-btn premium-btn-primary"
              >
                Add
              </button>
            </div>
          </div>
        </AccordionCard>

        <AccordionCard
          title="Education"
          open={openSection === 'education'}
          onToggle={() => setOpenSection(openSection === 'education' ? null : 'education')}
          hasContent={education.length > 0}
          preview={education.length > 0 ? `${education.length} ${education.length === 1 ? 'entry' : 'entries'}` : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          }
        >
          {education.length === 0 && editSection !== 'education' && (
            <p className="text-sm text-[var(--text-muted)]">No education added yet.</p>
          )}
          {education.map((edu, idx) => (
            <div key={idx} className="mb-3 glass-card p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{edu.qualification || 'Untitled'}</p>
              <p className="text-xs text-[var(--text-secondary)]">{edu.institution} &middot; {edu.year}</p>
              <button
                type="button"
                onClick={() => setEducation((prev) => prev.filter((_, i) => i !== idx))}
                className="mt-1 text-xs text-[var(--danger)] hover:underline pointer-active"
              >
                Remove
              </button>
            </div>
          ))}
          {editSection === 'education' ? (
            <EducationForm
              onAdd={(entry) => { setEducation((prev) => [...prev, entry]); setEditSection(null); }}
              onCancel={() => setEditSection(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditSection('education')}
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              + Add education
            </button>
          )}
        </AccordionCard>

        <AccordionCard
          title="Certifications"
          open={openSection === 'certifications'}
          onToggle={() => setOpenSection(openSection === 'certifications' ? null : 'certifications')}
          hasContent={certifications.length > 0}
          preview={certifications.length > 0 ? certifications.slice(0, 2).join(', ') + (certifications.length > 2 ? ` +${certifications.length - 2} more` : '') : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          }
        >
          <div className="space-y-3">
            {certifications.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No certifications added yet.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {certifications.map((c) => (
                <span key={c} className="skill-tag">
                  {c}
                  <button
                    type="button"
                    className="skill-tag-remove"
                    onClick={() => setCertifications((prev) => prev.filter((x) => x !== c))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="premium-input flex-1"
                placeholder="Add a certification"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCert())}
              />
              <button
                type="button"
                onClick={addCert}
                className="premium-btn premium-btn-primary"
              >
                Add
              </button>
            </div>
          </div>
        </AccordionCard>
      </div>

      {/* Which jobs matched me */}
      <div>
        <h2 className="section-heading">Which jobs matched me</h2>
        {matchedJobs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="empty-state-icon mx-auto">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">No matches yet</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Add skills to your CV to see matching jobs.
            </p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {matchedJobs.map((j) => {
              const barColor = j.score >= 80 ? 'high' : j.score >= 50 ? 'mid' : 'low';
              const scoreColor = j.score >= 80 ? 'text-[var(--match-high)]' : j.score >= 50 ? 'text-[var(--match-mid)]' : 'text-[var(--match-low)]';
              return (
                <Link
                  key={j.id}
                  href={`/feed/${j.id}`}
                  className="glass-card hover-lift flex items-center justify-between gap-4 p-4 transition hover:border-[var(--border-accent)] group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-hover)] transition-colors">{j.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{j.companyName}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="score-bar score-bar-sm flex-1 max-w-[100px] overflow-hidden rounded-full">
                        <div className={`score-bar-fill ${barColor}`} style={{ '--score-width': `${j.score}%` } as React.CSSProperties} />
                      </div>
                      <span className={`font-mono text-xs font-bold ${scoreColor}`}>
                        {j.score}%
                      </span>
                    </div>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
            <Link href="/feed" className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors group">
              Browse all jobs
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
