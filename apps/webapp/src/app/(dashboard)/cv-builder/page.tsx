'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ─── Types ──────────────────────────────────────────────────

type CareerLevel = 'entry' | 'mid' | 'senior' | 'executive';
type Sector = 'technology' | 'finance' | 'healthcare' | 'education' | 'ngo' | 'government' | 'agriculture' | 'mining' | 'retail' | 'media' | 'other';

interface CareerGoal {
  desiredTitle: string;
  careerLevel: CareerLevel;
  preferredSector: Sector;
}

interface PersonalDetails {
  fullName: string;
  location: string;
  phone: string;
  email: string;
  headline: string;
}

interface EducationEntry {
  id: string;
  institution: string;
  qualification: string;
  year: string;
  honors: string;
}

interface CertificationEntry {
  id: string;
  name: string;
  issuingBody: string;
  year: string;
}

interface ExperienceEntry {
  id: string;
  role: string;
  company: string;
  duration: string;
  achievements: string[];
}

interface SkillsData {
  technical: string[];
  languages: string[];
  softSkills: string[];
}

interface AchievementEntry {
  id: string;
  title: string;
  description: string;
}

interface ReferenceEntry {
  id: string;
  name: string;
  relationship: string;
  contact: string;
}

interface CvBuilderData {
  careerGoal: CareerGoal;
  personalDetails: PersonalDetails;
  education: EducationEntry[];
  certifications: CertificationEntry[];
  experience: ExperienceEntry[];
  skills: SkillsData;
  achievements: AchievementEntry[];
  references: ReferenceEntry[];
}

const EMPTY_DATA: CvBuilderData = {
  careerGoal: { desiredTitle: '', careerLevel: 'entry', preferredSector: 'technology' },
  personalDetails: { fullName: '', location: '', phone: '', email: '', headline: '' },
  education: [],
  certifications: [],
  experience: [],
  skills: { technical: [], languages: [], softSkills: [] },
  achievements: [],
  references: [],
};

const STEPS = [
  { key: 'career', label: 'Career Goal', icon: '🎯' },
  { key: 'personal', label: 'Personal', icon: '👤' },
  { key: 'education', label: 'Education', icon: '🎓' },
  { key: 'certifications', label: 'Certifications', icon: '📜' },
  { key: 'experience', label: 'Experience', icon: '💼' },
  { key: 'skills', label: 'Skills', icon: '⚡' },
  { key: 'achievements', label: 'Achievements', icon: '🏆' },
  { key: 'references', label: 'References', icon: '🤝' },
  { key: 'review', label: 'Review', icon: '✅' },
] as const;

const STORAGE_KEY = 'aetherlink_cv_builder_data';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function computeStrengthScore(data: CvBuilderData): number {
  let score = 0;
  if (data.personalDetails.fullName.trim().length > 2) score += 15;
  if (data.personalDetails.headline.trim().length > 5) score += 15;
  if (data.education.length > 0) score += 15;
  if (data.experience.length > 0) score += 20;
  const totalSkills = data.skills.technical.length + data.skills.languages.length + data.skills.softSkills.length;
  if (totalSkills >= 5) score += 15;
  else if (totalSkills > 0) score += 10;
  if (data.certifications.length > 0) score += 10;
  if (data.achievements.length > 0) score += 5;
  if (data.references.length > 0) score += 5;
  return Math.min(100, score);
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} className="score-ring-circle" />
      </svg>
      <span className="absolute font-display text-lg font-bold text-[var(--text-primary)]">{score}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function CvBuilderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<CvBuilderData>(EMPTY_DATA);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load saved data (localStorage first, then Supabase)
  useEffect(() => {
    setMounted(true);
    let loaded = false;
    // 1. Load from localStorage (instant)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData({ ...EMPTY_DATA, ...parsed });
        loaded = true;
      }
    } catch { /* ignore */ }
    // 2. Load from Supabase (async, overrides if newer)
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Direct fetch to bypass generated type system for tables not yet migrated
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cv_profiles?user_id=eq.${user.id}&select=*`;
          const res = await fetch(url, {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
          });
          if (res.ok) {
            const profiles = await res.json();
            if (profiles && profiles.length > 0) {
              const p = profiles[0];
              const supabaseData: CvBuilderData = {
                careerGoal: p.career_goal ?? EMPTY_DATA.careerGoal,
                personalDetails: p.personal_details ?? EMPTY_DATA.personalDetails,
                education: p.education ?? [],
                certifications: p.certifications ?? [],
                experience: p.experience ?? [],
                skills: p.skills ?? EMPTY_DATA.skills,
                achievements: p.achievements ?? [],
                references: p.references ?? [],
              };
              const supabaseScore = computeStrengthScore(supabaseData);
              const localScore = computeStrengthScore(loaded ? data : EMPTY_DATA);
              if (supabaseScore > localScore) {
                setData(supabaseData);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseData)); } catch { /* */ }
              }
            }
          }
        }
      } catch { /* table may not exist yet */ }
    })();
  }, []);

  // Auto-save
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [data, mounted]);

  const updateField = useCallback(<K extends keyof CvBuilderData>(key: K, value: CvBuilderData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const goToStep = (step: number) => {
    if (step >= 0 && step < STEPS.length) setCurrentStep(step);
  };

  const handleSave = async () => {
    setSaved(true);
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
    // Save to Supabase (best-effort, don't block UI)
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
            career_goal: data.careerGoal,
            personal_details: data.personalDetails,
            education: data.education,
            certifications: data.certifications,
            experience: data.experience,
            skills: data.skills,
            achievements: data.achievements,
            references: data.references,
            strength_score: computeStrengthScore(data),
          }),
        });
      }
    } catch { /* ignore network errors */ }
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGeneratePdf = () => {
    const html = generateCvHtml(data);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const strengthScore = computeStrengthScore(data);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">CV Builder</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Build your professional CV in 9 easy steps</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing score={strengthScore} size={48} />
          <button onClick={handleSave} className="premium-btn premium-btn-secondary text-sm pointer-active">
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((step, idx) => (
            <button
              key={step.key}
              onClick={() => goToStep(idx)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap pointer-active ${
                idx === currentStep
                  ? 'bg-[var(--accent-btn)] text-white'
                  : idx < currentStep
                  ? 'bg-[var(--success)]/10 text-[var(--success)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span>{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
              {idx < currentStep && <span className="sm:hidden">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="glass-card p-6">
        {currentStep === 0 && <CareerStep data={data.careerGoal} update={(v) => updateField('careerGoal', v)} />}
        {currentStep === 1 && <PersonalStep data={data.personalDetails} update={(v) => updateField('personalDetails', v)} />}
        {currentStep === 2 && <EducationStep data={data.education} update={(v) => updateField('education', v)} />}
        {currentStep === 3 && <CertificationStep data={data.certifications} update={(v) => updateField('certifications', v)} />}
        {currentStep === 4 && <ExperienceStep data={data.experience} update={(v) => updateField('experience', v)} />}
        {currentStep === 5 && <SkillsStep data={data.skills} update={(v) => updateField('skills', v)} />}
        {currentStep === 6 && <AchievementStep data={data.achievements} update={(v) => updateField('achievements', v)} />}
        {currentStep === 7 && <ReferenceStep data={data.references} update={(v) => updateField('references', v)} />}
        {currentStep === 8 && <ReviewStep data={data} score={strengthScore} onGeneratePdf={handleGeneratePdf} onSave={handleSave} />}
      </div>

      {/* Navigation */}
      {currentStep < 8 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="premium-btn premium-btn-ghost disabled:opacity-30 pointer-active"
          >
            ← Back
          </button>
          <button
            onClick={() => goToStep(currentStep + 1)}
            className="premium-btn premium-btn-primary pointer-active"
          >
            {currentStep === 7 ? 'Review' : 'Next'} →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step Components ────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function CareerStep({ data, update }: { data: CareerGoal; update: (v: CareerGoal) => void }) {
  return (
    <div>
      <StepHeader title="What kind of role are you looking for?" subtitle="Tell us about your career goals so we can help you find the right opportunities." />
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Desired job title</label>
          <input className="premium-input" placeholder="e.g. Software Engineer, Marketing Manager" value={data.desiredTitle}
            onChange={(e) => update({ ...data, desiredTitle: e.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Career level</label>
          <select className="premium-select" value={data.careerLevel}
            onChange={(e) => update({ ...data, careerLevel: e.target.value as CareerLevel })}>
            <option value="entry">Entry Level (0-2 years)</option>
            <option value="mid">Mid Level (3-5 years)</option>
            <option value="senior">Senior Level (6-10 years)</option>
            <option value="executive">Executive (10+ years)</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Preferred sector</label>
          <select className="premium-select" value={data.preferredSector}
            onChange={(e) => update({ ...data, preferredSector: e.target.value as Sector })}>
            <option value="technology">Technology</option>
            <option value="finance">Finance & Banking</option>
            <option value="healthcare">Healthcare</option>
            <option value="education">Education</option>
            <option value="ngo">NGO & Non-profit</option>
            <option value="government">Government</option>
            <option value="agriculture">Agriculture</option>
            <option value="mining">Mining</option>
            <option value="retail">Retail & Sales</option>
            <option value="media">Media & Communications</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function PersonalStep({ data, update }: { data: PersonalDetails; update: (v: PersonalDetails) => void }) {
  const emailValid = !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const phoneValid = !data.phone || /^[\d+\-() ]{7,20}$/.test(data.phone);

  return (
    <div>
      <StepHeader title="Tell us about yourself" subtitle="This information goes at the top of your CV." />
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Full name *</label>
          <input className={`premium-input ${data.fullName.trim().length > 0 && data.fullName.trim().length <= 2 ? 'border-[var(--warning)]' : ''}`} placeholder="John Doe" value={data.fullName}
            onChange={(e) => update({ ...data, fullName: e.target.value })} />
          {data.fullName.trim().length > 0 && data.fullName.trim().length <= 2 && (
            <p className="mt-1 text-xs text-[var(--warning)]">Name seems short - please enter your full name.</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Location</label>
            <input className="premium-input" placeholder="Harare, Zimbabwe" value={data.location}
              onChange={(e) => update({ ...data, location: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Phone</label>
            <input className={`premium-input ${!phoneValid ? 'border-[var(--warning)]' : ''}`} placeholder="+263 77 123 4567" value={data.phone}
              onChange={(e) => update({ ...data, phone: e.target.value })} />
            {!phoneValid && <p className="mt-1 text-xs text-[var(--warning)]">Enter a valid phone number (7-20 digits).</p>}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Email</label>
          <input className={`premium-input ${!emailValid ? 'border-[var(--warning)]' : ''}`} type="email" placeholder="john@example.com" value={data.email}
            onChange={(e) => update({ ...data, email: e.target.value })} />
          {!emailValid && <p className="mt-1 text-xs text-[var(--warning)]">Enter a valid email address.</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Professional headline</label>
          <textarea className="premium-input min-h-[80px]" placeholder="e.g. Full Stack Developer with 5+ years of experience building scalable web applications..."
            value={data.headline} onChange={(e) => update({ ...data, headline: e.target.value })} />
          <p className="mt-1 text-xs text-[var(--text-muted)]">A 1-2 sentence summary of who you are professionally. This appears right under your name.</p>
        </div>
      </div>
    </div>
  );
}

function EducationStep({ data, update }: { data: EducationEntry[]; update: (v: EducationEntry[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ institution: '', qualification: '', year: '', honors: '' });

  const add = () => {
    if (!form.qualification.trim()) return;
    update([...data, { id: generateId(), ...form }]);
    setForm({ institution: '', qualification: '', year: '', honors: '' });
    setShowForm(false);
  };

  return (
    <div>
      <StepHeader title="Where did you study?" subtitle="Add your educational background, starting with the most recent." />
      {data.map((edu) => (
        <div key={edu.id} className="mb-3 glass-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{edu.qualification}</p>
              <p className="text-sm text-[var(--text-secondary)]">{edu.institution} {edu.year && `· ${edu.year}`}</p>
              {edu.honors && <p className="text-xs text-[var(--text-muted)] mt-1">{edu.honors}</p>}
            </div>
            <button onClick={() => update(data.filter(e => e.id !== edu.id))} className="text-xs text-[var(--danger)] hover:underline">Remove</button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
          <input className="premium-input" placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          <input className="premium-input" placeholder="Qualification (e.g. BSc Computer Science)" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="premium-input" placeholder="Year (e.g. 2022)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            <input className="premium-input" placeholder="Honors (optional)" value={form.honors} onChange={(e) => setForm({ ...form, honors: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="premium-btn premium-btn-primary text-sm">Add</button>
            <button onClick={() => setShowForm(false)} className="premium-btn premium-btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-sm font-medium text-[var(--accent-hover)] hover:underline">+ Add education</button>
      )}
    </div>
  );
}

function CertificationStep({ data, update }: { data: CertificationEntry[]; update: (v: CertificationEntry[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', issuingBody: '', year: '' });

  const add = () => {
    if (!form.name.trim()) return;
    update([...data, { id: generateId(), ...form }]);
    setForm({ name: '', issuingBody: '', year: '' });
    setShowForm(false);
  };

  return (
    <div>
      <StepHeader title="Any professional certifications?" subtitle="Add certifications, online courses, or professional development programs." />
      {data.map((cert) => (
        <div key={cert.id} className="mb-3 glass-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{cert.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{cert.issuingBody} {cert.year && `· ${cert.year}`}</p>
            </div>
            <button onClick={() => update(data.filter(e => e.id !== cert.id))} className="text-xs text-[var(--danger)] hover:underline">Remove</button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
          <input className="premium-input" placeholder="Certification name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="premium-input" placeholder="Issuing body" value={form.issuingBody} onChange={(e) => setForm({ ...form, issuingBody: e.target.value })} />
            <input className="premium-input" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="premium-btn premium-btn-primary text-sm">Add</button>
            <button onClick={() => setShowForm(false)} className="premium-btn premium-btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-sm font-medium text-[var(--accent-hover)] hover:underline">+ Add certification</button>
      )}
    </div>
  );
}

function ExperienceStep({ data, update }: { data: ExperienceEntry[]; update: (v: ExperienceEntry[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ role: '', company: '', duration: '', achievements: '' });

  const add = () => {
    if (!form.role.trim()) return;
    update([...data, { id: generateId(), role: form.role, company: form.company, duration: form.duration, achievements: form.achievements.split('\n').filter(Boolean) }]);
    setForm({ role: '', company: '', duration: '', achievements: '' });
    setShowForm(false);
  };

  return (
    <div>
      <StepHeader title="Tell us about your experience" subtitle="Include work, volunteer roles, or significant projects. Don't worry if you're just starting out - we'll help you frame it." />
      {data.length === 0 && (
        <div className="mb-3 p-3 rounded-lg bg-[var(--accent)]/[0.06] border border-[var(--border-accent)]">
          <p className="text-xs text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">No experience yet?</strong> That's okay! Consider adding:
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-muted)]">
            <li>• School projects or university assignments</li>
            <li>• Volunteer work or community involvement</li>
            <li>• Personal projects (websites, apps, blogs)</li>
            <li>• Informal work (helping at a family business, tutoring)</li>
            <li>• Extracurricular activities or club leadership</li>
          </ul>
        </div>
      )}
      {data.map((exp) => (
        <div key={exp.id} className="mb-3 glass-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{exp.role}</p>
              <p className="text-sm text-[var(--text-secondary)]">{exp.company} {exp.duration && `· ${exp.duration}`}</p>
              {exp.achievements.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {exp.achievements.map((a, i) => (
                    <li key={i} className="text-xs text-[var(--text-muted)] flex items-start gap-1.5">
                      <span className="text-[var(--accent-active)] mt-0.5">•</span> {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => update(data.filter(e => e.id !== exp.id))} className="text-xs text-[var(--danger)] hover:underline">Remove</button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
          <input className="premium-input" placeholder="Role / title" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="premium-input" placeholder="Company / organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input className="premium-input" placeholder="Duration (e.g. 2020 - Present)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
          <div>
            <textarea className="premium-input min-h-[80px]" placeholder="Key achievements (one per line)" value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Tip: Start each bullet with an action verb like "Led", "Built", "Managed"</p>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="premium-btn premium-btn-primary text-sm">Add</button>
            <button onClick={() => setShowForm(false)} className="premium-btn premium-btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-sm font-medium text-[var(--accent-hover)] hover:underline">+ Add experience</button>
      )}
    </div>
  );
}

function SkillsStep({ data, update }: { data: SkillsData; update: (v: SkillsData) => void }) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'technical' | 'languages' | 'softSkills'>('technical');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || data[activeTab].includes(trimmed)) return;
    update({ ...data, [activeTab]: [...data[activeTab], trimmed] });
    setInput('');
  };

  const remove = (skill: string) => {
    update({ ...data, [activeTab]: data[activeTab].filter(s => s !== skill) });
  };

  const tabs = [
    { key: 'technical' as const, label: 'Technical', count: data.technical.length },
    { key: 'languages' as const, label: 'Languages', count: data.languages.length },
    { key: 'softSkills' as const, label: 'Soft Skills', count: data.softSkills.length },
  ];

  return (
    <div>
      <StepHeader title="What are you great at?" subtitle="Skills help employers find you. Add as many as you can - we'll help you organize them." />
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`pill ${activeTab === tab.key ? 'active' : ''}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <input className="premium-input flex-1" placeholder={`Add a ${activeTab} skill...`}
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="premium-btn premium-btn-primary text-sm">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data[activeTab].map(skill => (
          <span key={skill} className="skill-tag">
            {skill}
            <button onClick={() => remove(skill)} className="skill-tag-remove" aria-label={`Remove ${skill}`}>×</button>
          </span>
        ))}
        {data[activeTab].length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No {activeTab} skills added yet. Try adding skills like "JavaScript", "Project Management", or "Shona".</p>
        )}
      </div>
    </div>
  );
}

function AchievementStep({ data, update }: { data: AchievementEntry[]; update: (v: AchievementEntry[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const add = () => {
    if (!form.title.trim()) return;
    update([...data, { id: generateId(), ...form }]);
    setForm({ title: '', description: '' });
    setShowForm(false);
  };

  return (
    <div>
      <StepHeader title="Any notable achievements?" subtitle="Awards, publications, hackathon wins, or anything you're proud of." />
      {data.map((a) => (
        <div key={a.id} className="mb-3 glass-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{a.title}</p>
              {a.description && <p className="text-sm text-[var(--text-secondary)] mt-1">{a.description}</p>}
            </div>
            <button onClick={() => update(data.filter(e => e.id !== a.id))} className="text-xs text-[var(--danger)] hover:underline">Remove</button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
          <input className="premium-input" placeholder="Achievement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="premium-input min-h-[60px]" placeholder="Brief description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={add} className="premium-btn premium-btn-primary text-sm">Add</button>
            <button onClick={() => setShowForm(false)} className="premium-btn premium-btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-sm font-medium text-[var(--accent-hover)] hover:underline">+ Add achievement</button>
      )}
    </div>
  );
}

function ReferenceStep({ data, update }: { data: ReferenceEntry[]; update: (v: ReferenceEntry[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', contact: '' });

  const add = () => {
    if (!form.name.trim()) return;
    update([...data, { id: generateId(), ...form }]);
    setForm({ name: '', relationship: '', contact: '' });
    setShowForm(false);
  };

  return (
    <div>
      <StepHeader title="Who can vouch for you?" subtitle="Add professional references - managers, professors, or colleagues who can speak to your work." />
      {data.map((ref) => (
        <div key={ref.id} className="mb-3 glass-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{ref.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{ref.relationship}</p>
              {ref.contact && <p className="text-xs text-[var(--text-muted)] mt-1">{ref.contact}</p>}
            </div>
            <button onClick={() => update(data.filter(e => e.id !== ref.id))} className="text-xs text-[var(--danger)] hover:underline">Remove</button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-surface)] p-4">
          <input className="premium-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="premium-input" placeholder="Relationship (e.g. Former Manager)" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
            <input className="premium-input" placeholder="Contact (email or phone)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="premium-btn premium-btn-primary text-sm">Add</button>
            <button onClick={() => setShowForm(false)} className="premium-btn premium-btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-sm font-medium text-[var(--accent-hover)] hover:underline">+ Add reference</button>
      )}
    </div>
  );
}

function ReviewStep({ data, score, onGeneratePdf, onSave }: { data: CvBuilderData; score: number; onGeneratePdf: () => void; onSave: () => void }) {
  const totalSkills = data.skills.technical.length + data.skills.languages.length + data.skills.softSkills.length;

  return (
    <div>
      <StepHeader title="Review your CV" subtitle="Make sure everything looks good before generating your PDF." />

      {/* Score */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-[var(--bg-surface)]">
        <ScoreRing score={score} size={64} />
        <div>
          <p className="font-display text-lg font-bold text-[var(--text-primary)]">CV Strength: {score}/100</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {score >= 70 ? 'Great profile! You are ready to apply.' : score >= 40 ? 'Good start! Add more details to stand out.' : 'Add more information to strengthen your CV.'}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{data.experience.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Experience</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{data.education.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Education</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{totalSkills}</p>
          <p className="text-xs text-[var(--text-muted)]">Skills</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{data.certifications.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Certifications</p>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-4 mb-6">
        {data.personalDetails.fullName && (
          <div className="glass-card p-4">
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">{data.personalDetails.fullName}</p>
            {data.personalDetails.headline && <p className="text-sm text-[var(--text-secondary)] mt-1">{data.personalDetails.headline}</p>}
            <p className="text-xs text-[var(--text-muted)] mt-1">{[data.personalDetails.location, data.personalDetails.email, data.personalDetails.phone].filter(Boolean).join(' · ')}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Experience</p>
            {data.experience.map(exp => (
              <div key={exp.id} className="mb-2">
                <p className="text-sm text-[var(--text-primary)]">{exp.role} - {exp.company}</p>
                <p className="text-xs text-[var(--text-muted)]">{exp.duration}</p>
              </div>
            ))}
          </div>
        )}
        {totalSkills > 0 && (
          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {[...data.skills.technical, ...data.skills.languages, ...data.skills.softSkills].map(s => (
                <span key={s} className="skill-tag">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onGeneratePdf} className="premium-btn premium-btn-primary py-3 flex-1 pointer-active">
          📄 Generate PDF
        </button>
        <button onClick={onSave} className="premium-btn premium-btn-secondary py-3 flex-1 pointer-active">
          💾 Save CV
        </button>
      </div>
    </div>
  );
}

// ─── PDF HTML Generator ─────────────────────────────────────

function generateCvHtml(data: CvBuilderData): string {
  const totalSkills = [...data.skills.technical, ...data.skills.languages, ...data.skills.softSkills];

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${data.personalDetails.fullName || 'CV'} - AetherLink CV</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 28px; color: #111; margin-bottom: 4px; }
  .headline { font-size: 14px; color: #555; margin-bottom: 8px; }
  .contact { font-size: 12px; color: #777; margin-bottom: 24px; }
  h2 { font-size: 16px; color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .entry { margin-bottom: 12px; }
  .entry-title { font-weight: 600; font-size: 14px; }
  .entry-sub { font-size: 13px; color: #555; }
  .skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill { background: #f0f0f0; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
  ul { padding-left: 20px; }
  li { font-size: 13px; margin-bottom: 4px; }
  .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
  @media print {
    body { padding: 15px 20px; font-size: 11px; }
    h1 { font-size: 22px; }
    h2 { font-size: 13px; margin: 14px 0 6px; page-break-after: avoid; }
    .entry { page-break-inside: avoid; }
    .skills { gap: 4px; }
    .skill { font-size: 10px; padding: 1px 8px; }
    .footer { display: none; }
  }
</style></head><body>
  <h1>${data.personalDetails.fullName || 'Your Name'}</h1>
  ${data.personalDetails.headline ? `<p class="headline">${data.personalDetails.headline}</p>` : ''}
  <p class="contact">${[data.personalDetails.location, data.personalDetails.email, data.personalDetails.phone].filter(Boolean).join(' · ')}</p>

  ${data.careerGoal.desiredTitle ? `<h2>Career Objective</h2><p>${data.careerGoal.desiredTitle}${data.careerGoal.careerLevel ? ` — ${data.careerGoal.careerLevel} level` : ''}</p>` : ''}

  ${data.experience.length > 0 ? `<h2>Experience</h2>${data.experience.map(e => `
    <div class="entry">
      <p class="entry-title">${e.role}</p>
      <p class="entry-sub">${e.company}${e.duration ? ` · ${e.duration}` : ''}</p>
      ${e.achievements.length > 0 ? `<ul>${e.achievements.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}` : ''}

  ${data.education.length > 0 ? `<h2>Education</h2>${data.education.map(e => `
    <div class="entry">
      <p class="entry-title">${e.qualification}</p>
      <p class="entry-sub">${e.institution}${e.year ? ` · ${e.year}` : ''}</p>
      ${e.honors ? `<p class="entry-sub">${e.honors}</p>` : ''}
    </div>`).join('')}` : ''}

  ${totalSkills.length > 0 ? `<h2>Skills</h2><div class="skills">${totalSkills.map(s => `<span class="skill">${s}</span>`).join('')}</div>` : ''}

  ${data.certifications.length > 0 ? `<h2>Certifications</h2>${data.certifications.map(c => `
    <div class="entry">
      <p class="entry-title">${c.name}</p>
      <p class="entry-sub">${c.issuingBody}${c.year ? ` · ${c.year}` : ''}</p>
    </div>`).join('')}` : ''}

  ${data.achievements.length > 0 ? `<h2>Achievements</h2>${data.achievements.map(a => `
    <div class="entry">
      <p class="entry-title">${a.title}</p>
      ${a.description ? `<p class="entry-sub">${a.description}</p>` : ''}
    </div>`).join('')}` : ''}

  ${data.references.length > 0 ? `<h2>References</h2>${data.references.map(r => `
    <div class="entry">
      <p class="entry-title">${r.name}</p>
      <p class="entry-sub">${r.relationship}${r.contact ? ` · ${r.contact}` : ''}</p>
    </div>`).join('')}` : ''}

  <p class="footer">Generated by AetherLink — ${new Date().toLocaleDateString()}</p>
</body></html>`;
}
