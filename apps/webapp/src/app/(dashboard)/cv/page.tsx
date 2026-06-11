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
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--accent-dim)] bg-[var(--bg-surface)] p-4">
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        placeholder="Role / title"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        placeholder="Duration (e.g. 2 years)"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAdd({ role, company, duration })}
          disabled={!role.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--accent-dim)] bg-[var(--bg-surface)] p-4">
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        placeholder="Institution"
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        placeholder="Qualification (e.g. BSc Computer Science)"
        value={qualification}
        onChange={(e) => setQualification(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        placeholder="Year (e.g. 2022)"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAdd({ institution, qualification, year })}
          disabled={!qualification.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-[var(--bg-surface)]"
      >
        <span className="font-display text-base font-bold text-[var(--text-primary)]">{title}</span>
        <svg
          className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-[var(--border)] p-4">{children}</div>}
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
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) { router.push('/'); return; }

        const [prof, feed] = await Promise.all([
          sdk.getAetherLinkProfile(),
          sdk.listFeedJobs({ limit: 50 }),
        ]);
        setProfile(prof ?? null);
        setJobs(feed.jobs);
        if (prof) {
          setFullName(prof.full_name ?? '');
          setHeadline(prof.headline ?? '');
          setSkills(prof.skills ?? []);
          setCertifications(prof.certifications ?? []);
        }
      } catch {
        // ignore
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">My CV</h1>
      </div>

      {/* Score card */}
      <div className="glass-card flex items-center gap-6 p-6">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg width="80" height="80" className="-rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#FFD700"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={213.6}
              strokeDashoffset={213.6 - (cvScore / 100) * 213.6}
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute font-display text-2xl font-bold text-[var(--accent)]">{cvScore}</span>
        </div>
        <div>
          <p className="font-display text-lg font-bold text-[var(--text-primary)]">CV Strength</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {cvScore < 40
              ? 'Add your details to improve your match score.'
              : cvScore < 70
              ? 'Good start! Add more skills to stand out.'
              : 'Great profile! You are ready to apply.'}
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        <AccordionCard
          title="Personal Info"
          open={openSection === 'personal'}
          onToggle={() => setOpenSection(openSection === 'personal' ? null : 'personal')}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]">Full name</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]">Headline</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
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
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs text-[var(--accent)]">
                  {s}
                  <button
                    type="button"
                    className="ml-1.5 text-[var(--accent-dim)] hover:text-[var(--accent)]"
                    onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                placeholder="Add a skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                onClick={addSkill}
                className="rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-black hover:brightness-110"
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

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-40"
      >
        {saving ? 'Saving\u2026' : 'Save Changes'}
      </button>

      {/* Which jobs matched me */}
      <div>
        <h2 className="font-display mb-4 text-xl font-bold text-[var(--text-primary)]">
          Which jobs matched me
        </h2>
        {matchedJobs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Add skills to your CV to see matching jobs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {matchedJobs.map((j) => (
              <Link
                key={j.id}
                href={`/feed/${j.id}`}
                className="glass-card flex items-center justify-between p-4 transition hover:border-[var(--accent-dim)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{j.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{j.companyName}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-[var(--match-high)]">
                  {j.score}%
                </span>
              </Link>
            ))}
            <Link href="/feed" className="mt-3 block text-center text-sm text-[var(--accent)] hover:underline">
              View all jobs &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}