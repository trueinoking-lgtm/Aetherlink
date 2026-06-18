'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Profile } from '@aetherlink/core';
import { createClient } from '@/lib/supabase/client';
import { computeMatchScore } from '@/lib/scoring';

type CvSection = 'personal' | 'experience' | 'skills' | 'education';

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
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
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
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasContent?: boolean;
  preview?: string;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      >
        <span className="flex items-center gap-3 min-w-0">
          {hasContent ? (
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shrink-0" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)] shrink-0" />
          )}
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
  const [jobs, setJobs] = useState<{ id: number; title: string; companyName: string; raw_text?: string }[]>([]);
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
    .map((j) => ({ ...j, score: computeMatchScore(j.title, j.raw_text, skills) }))
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
    <div className="space-y-8 page-enter">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">My CV</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="premium-btn premium-btn-secondary text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Score card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-6">
          <CvScoreRing score={cvScore} />
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">CV Strength</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {cvScore < 40
                ? 'Add your details to improve your match score.'
                : cvScore < 70
                ? 'Good start! Add more skills to stand out.'
                : 'Great profile! You are ready to apply.'}
            </p>
            {/* Progress bar */}
            <div className="mt-3 score-bar">
              <div className={`score-bar-fill ${cvScore >= 70 ? 'high' : cvScore >= 40 ? 'mid' : 'low'}`} style={{ width: `${cvScore}%` }} />
            </div>
          </div>
        </div>
        {/* Tips */}
        {cvScore < 70 && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-xs font-medium text-[var(--text-secondary)]">💡 Tips to improve:</p>
            <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-muted)]">
              {!fullName && <li>• Add your full name</li>}
              {!headline && <li>• Write a professional headline</li>}
              {skills.length === 0 && <li>• Add relevant skills</li>}
              {skills.length > 0 && skills.length <= 3 && <li>• Add more skills (aim for 5+)</li>}
              {experience.length === 0 && <li>• Add work experience</li>}
              {education.length === 0 && <li>• Add education details</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        <AccordionCard
          title="Personal Info"
          open={openSection === 'personal'}
          onToggle={() => setOpenSection(openSection === 'personal' ? null : 'personal')}
          hasContent={!!fullName || !!headline}
          preview={fullName ? `${fullName}${headline ? ' — ' + headline : ''}` : undefined}
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
        >
          {experience.length === 0 && editSection !== 'experience' && (
            <p className="text-sm text-[var(--text-muted)]">No experience added yet.</p>
          )}
          {experience.map((exp, idx) => (
            <div key={idx} className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{exp.role || 'Untitled role'}</p>
              <p className="text-xs text-[var(--text-secondary)]">{exp.company} &middot; {exp.duration}</p>
              <button
                type="button"
                onClick={() => setExperience((prev) => prev.filter((_, i) => i !== idx))}
                className="mt-1 text-xs text-[var(--danger)] hover:underline"
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
        >
          {education.length === 0 && editSection !== 'education' && (
            <p className="text-sm text-[var(--text-muted)]">No education added yet.</p>
          )}
          {education.map((edu, idx) => (
            <div key={idx} className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{edu.qualification || 'Untitled'}</p>
              <p className="text-xs text-[var(--text-secondary)]">{edu.institution} &middot; {edu.year}</p>
              <button
                type="button"
                onClick={() => setEducation((prev) => prev.filter((_, i) => i !== idx))}
                className="mt-1 text-xs text-[var(--danger)] hover:underline"
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
            <p className="text-sm text-[var(--text-secondary)]">
              Add skills to your CV to see matching jobs.
            </p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {matchedJobs.map((j) => {
              const barColor = j.score >= 80 ? 'high' : j.score >= 50 ? 'mid' : 'low';
              return (
                <Link
                  key={j.id}
                  href={`/feed/${j.id}`}
                  className="glass-card hover-lift flex items-center justify-between gap-4 p-4 transition hover:border-[var(--border-accent)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{j.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{j.companyName}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="score-bar flex-1 max-w-[100px]">
                        <div className={`score-bar-fill ${barColor}`} style={{ width: `${j.score}%` }} />
                      </div>
                    </div>
                  </div>
                  <span className={`job-card-match-badge ${barColor} shrink-0`}>
                    {j.score}%
                  </span>
                </Link>
              );
            })}
            <Link href="/feed" className="mt-3 block text-center text-sm text-[var(--accent)] hover:underline">
              View all jobs →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
