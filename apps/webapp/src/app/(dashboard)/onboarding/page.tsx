'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Profile } from '@aetherlink/core';
import {
  readOnboardingPreferences,
  writeOnboardingPreferences,
} from '@/lib/onboardingPreferences';
import { createClient } from '@/lib/supabase/client';

const JOB_TYPES = ['Tech', 'Finance', 'NGO', 'Construction', 'Healthcare', 'Other'];
const ZW_CITIES = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Masvingo', 'Chinhoyi', 'Kadoma', 'Victoria Falls'];

type Step1Data = { fullName: string; location: string; jobTypes: string[] };
type Step2Data = {
  mode: 'build' | 'upload';
  currentRole: string;
  skills: string[];
  experienceYears: string;
  education: string;
  uploadedFileName: string | null;
};
type Step3Data = {
  salaryFloor: number;
  jobTypes: string[];
  blacklist: string[];
  autoApplyEnabled: boolean;
  autoApplyThreshold: number;
};

function computeCvStrength(step2: Step2Data): number {
  let score = 0;
  if (step2.currentRole.trim().length > 2) score += 1;
  if (step2.skills.length > 0) score += 1;
  if (step2.skills.length > 3) score += 1;
  if (step2.experienceYears.trim().length > 0) score += 1;
  if (step2.education.trim().length > 3) score += 1;
  if (step2.mode === 'upload' && step2.uploadedFileName) score += 1;
  return Math.min(5, score);
}

function ProgressDots({ step }: { step: number }) {
  const STEP_LABELS = ['About You', 'Your CV', 'Settings'];
  return (
    <div className="mb-10 flex flex-col items-center gap-2">
      <div className="flex items-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <div className={`h-px w-10 rounded-full transition-colors duration-200 ${i <= step ? 'bg-[var(--accent)]/60' : 'bg-[var(--border)]'}`} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                  i === step
                    ? 'bg-[var(--accent)] text-[var(--text-primary)] scale-110 shadow-[var(--shadow-glow)]'
                    : i < step
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                    : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
                }`}
              >
              {i < step ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
              <span className={`text-[10px] font-medium text-center ${i === step ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <span className="text-xs font-medium text-[var(--text-muted)]" aria-live="polite">
        Step {step + 1} of 3
      </span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const [step1, setStep1] = useState<Step1Data>({ fullName: '', location: '', jobTypes: [] });
  const [step2, setStep2] = useState<Step2Data>({
    mode: 'build',
    currentRole: '',
    skills: [],
    experienceYears: '',
    education: '',
    uploadedFileName: null,
  });
  const [step3, setStep3] = useState<Step3Data>({
    salaryFloor: 0,
    jobTypes: [],
    blacklist: [],
    autoApplyEnabled: true,
    autoApplyThreshold: 80,
  });
  const [skillInput, setSkillInput] = useState('');
  const [blacklistInput, setBlacklistInput] = useState('');

  useEffect(() => {
    void (async () => {
      const isDebug = window.location.search.includes('debug=true');
      try {
        const storedPrefs = readOnboardingPreferences();
        const { user } = await sdk.getUser();
        if (!user && !isDebug) {
          router.push('/');
          return;
        }

        const prof = await sdk.getAetherLinkProfile();

        let persistedBlacklist: string[];
        if (isDebug) {
          persistedBlacklist = storedPrefs.blacklistedCompanies;
        } else if (user) {
          const { data } = await supabase.from('advanced_matching').select('blacklisted_companies').eq('user_id', user.id).maybeSingle();
          persistedBlacklist = data?.blacklisted_companies ?? storedPrefs.blacklistedCompanies;
        } else {
          persistedBlacklist = storedPrefs.blacklistedCompanies;
        }

        if (prof) {
          setStep1({
            fullName: prof.full_name ?? '',
            location: prof.location ?? storedPrefs.location,
            jobTypes: prof.preferred_job_types ?? storedPrefs.preferredJobTypes,
          });
          setStep2((prev) => ({
            ...prev,
            currentRole: prof.headline ?? '',
            skills: prof.skills ?? [],
          }));
          setStep3({
            salaryFloor: prof.salary_floor ?? storedPrefs.salaryFloor,
            jobTypes: prof.preferred_job_types ?? storedPrefs.preferredJobTypes,
            blacklist: persistedBlacklist,
            autoApplyEnabled: prof.auto_apply_enabled ?? storedPrefs.autoApplyEnabled,
            autoApplyThreshold: prof.auto_apply_threshold ?? storedPrefs.autoApplyThreshold,
          });
        } else {
          setStep1((prev) => ({
            ...prev,
            location: storedPrefs.location,
            jobTypes: storedPrefs.preferredJobTypes,
          }));
          setStep3({
            salaryFloor: storedPrefs.salaryFloor,
            jobTypes: storedPrefs.preferredJobTypes,
            blacklist: persistedBlacklist,
            autoApplyEnabled: storedPrefs.autoApplyEnabled,
            autoApplyThreshold: storedPrefs.autoApplyThreshold,
          });
        }
      } catch (e) {
        console.error('Onboarding load error:', e);
      }
      setLoading(false);
    })();
  }, [sdk, supabase, router]);

  const isStepValid = (): boolean => {
    if (step === 0) return step1.fullName.trim().length > 0 && step1.location.trim().length > 0;
    if (step === 1) {
      if (step2.mode === 'build') {
        return step2.currentRole.trim().length > 0 && step2.skills.length > 0;
      }
      return step2.uploadedFileName !== null;
    }
    return true;
  };

  const cvStars = computeCvStrength(step2);

  async function handleFinish() {
    setLoading(true);
    try {
      const isDebug = window.location.search.includes('debug=true');
      const prefsPayload = {
        location: step1.location,
        preferred_job_types: step3.jobTypes,
        salary_floor: step3.salaryFloor,
        auto_apply_enabled: step3.autoApplyEnabled,
        auto_apply_threshold: step3.autoApplyThreshold,
      };

      if (isDebug) {
        writeOnboardingPreferences({
          location: step1.location,
          preferredJobTypes: step3.jobTypes,
          salaryFloor: step3.salaryFloor,
          autoApplyEnabled: step3.autoApplyEnabled,
          autoApplyThreshold: step3.autoApplyThreshold,
          blacklistedCompanies: step3.blacklist,
        });
        router.push('/feed');
        return;
      }

      await sdk.updateAetherLinkProfile({
        full_name: step1.fullName,
        headline: step2.currentRole,
        skills: step2.skills,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const [matchingResult, profileFallbackResult] = await Promise.all([
          supabase.from('advanced_matching').upsert(
            {
              blacklisted_companies: step3.blacklist,
              chatgpt_prompt: '',
            },
            { onConflict: 'user_id' },
          ),
          supabase.from('profiles').update(prefsPayload).eq('user_id', user.id),
        ]);

        if (matchingResult.error) {
          throw matchingResult.error;
        }

        if (profileFallbackResult.error && profileFallbackResult.error.code !== '42703') {
          throw profileFallbackResult.error;
        }
        if (profileFallbackResult.error?.code === '42703') {
          console.warn('Onboarding: profiles column missing (42703) — preferences saved locally only');
        }
      }

      writeOnboardingPreferences({
        location: step1.location,
        preferredJobTypes: step3.jobTypes,
        salaryFloor: step3.salaryFloor,
        autoApplyEnabled: step3.autoApplyEnabled,
        autoApplyThreshold: step3.autoApplyThreshold,
        blacklistedCompanies: step3.blacklist,
      });

      router.push('/feed');
    } catch (e) {
      console.error('Onboarding finish error:', e);
    } finally {
      setLoading(false);
    }
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !step2.skills.includes(trimmed)) {
      setStep2((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setSkillInput('');
  }

  function addBlacklist() {
    const trimmed = blacklistInput.trim();
    if (trimmed && !step3.blacklist.includes(trimmed)) {
      setStep3((prev) => ({ ...prev, blacklist: [...prev.blacklist, trimmed] }));
    }
    setBlacklistInput('');
  }

  function toggleJobType(type: string) {
    setStep1((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type) ? prev.jobTypes.filter((t) => t !== type) : [...prev.jobTypes, type],
    }));
  }

  function toggleStep3JobType(type: string) {
    setStep3((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type) ? prev.jobTypes.filter((t) => t !== type) : [...prev.jobTypes, type],
    }));
  }

  useEffect(() => {
    document.body.classList.add('onboarding-active');
    return () => document.body.classList.remove('onboarding-active');
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Setting up your onboarding…</p>
        </div>
      </div>
    );
  }

  // Ensure body class is set even during loading
  if (typeof document !== 'undefined') {
    document.body.classList.add('onboarding-active');
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[var(--bg-base)] px-4 py-8 page-enter">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="bg-orb absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="bg-orb-delayed absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="bg-orb-slow absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--accent)]/3 blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg-base)_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            <span className="text-[var(--text-primary)]">Aether</span><span className="gradient-text">Link</span>
          </h2>
        </div>

        <ProgressDots step={step} />

        {/* Step 1: Tell us about you */}
        {step === 0 && (
          <div className="glass-card animate-fade-in p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Tell us about you</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Let&rsquo;s start with the basics</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Full name <span className="text-[var(--danger)]">*</span></label>
                <input
                  className="premium-input"
                  placeholder="Your full name"
                  value={step1.fullName}
                  onChange={(e) => setStep1((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Location (City) <span className="text-[var(--danger)]">*</span></label>
                <select
                  className="premium-select"
                  value={step1.location}
                  onChange={(e) => setStep1((prev) => ({ ...prev, location: e.target.value }))}
                >
                  <option value="">Select your city</option>
                  {ZW_CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>

              <div>
                <label className="mb-2.5 block text-sm font-medium text-[var(--text-secondary)]">Preferred job type</label>
                <div className="grid grid-cols-3 gap-2">
                  {JOB_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleJobType(type)}
                      className={`pill pointer-active ${step1.jobTypes.includes(type) ? 'active' : ''}`}
                      aria-pressed={step1.jobTypes.includes(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-end gap-4">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="premium-btn premium-btn-secondary mobile-touch pointer-active"
                >
                  Back
                </button>
              )}

              {step < 2 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!isStepValid()}
                  className="premium-btn premium-btn-primary mobile-touch flex-1 sm:flex-none sm:min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed pointer-active"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="premium-btn premium-btn-primary mobile-touch flex-1 sm:flex-none sm:min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed pointer-active"
                >
                  {loading ? 'Saving…' : 'Start applying'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Your CV */}
        {step === 1 && (
          <div className="glass-card animate-fade-in p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Your CV</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Build your profile or upload a PDF</p>
            </div>

            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="flex gap-1 rounded-lg bg-[var(--bg-surface)] p-1">
                <button
                  type="button"
                  onClick={() => setStep2((prev) => ({ ...prev, mode: 'build' }))}
                  className={`toggle-btn ${step2.mode === 'build' ? 'active' : ''}`}
                >
                  Build it here
                </button>
                <button
                  type="button"
                  onClick={() => setStep2((prev) => ({ ...prev, mode: 'upload' }))}
                  className={`toggle-btn ${step2.mode === 'upload' ? 'active' : ''}`}
                >
                  Upload PDF
                </button>
              </div>

              {/* CV strength indicator */}
              <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-surface)] p-3">
                <span className="text-sm text-[var(--text-secondary)]">CV Strength:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-5 w-5 ${star <= cvStars ? 'text-[var(--accent)]' : 'text-[var(--border)]'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-[var(--text-muted)]">{cvStars}/5</span>
              </div>

              {/* Build mode */}
              {step2.mode === 'build' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Current role</label>
                    <input
                      className="premium-input"
                      placeholder="e.g. Software Engineer"
                      value={step2.currentRole}
                      onChange={(e) => setStep2((prev) => ({ ...prev, currentRole: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Skills</label>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {step2.skills.map((s) => (
                        <span key={s} className="skill-tag">
                          {s}
                          <button
                            type="button"
                            className="skill-tag-remove"
                            onClick={() => setStep2((prev) => ({ ...prev, skills: prev.skills.filter((x) => x !== s) }))}
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
                        className="premium-btn premium-btn-primary pointer-active"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Years of experience</label>
                    <input
                      type="number"
                      className="premium-input"
                      placeholder="e.g. 3"
                      value={step2.experienceYears}
                      onChange={(e) => setStep2((prev) => ({ ...prev, experienceYears: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Education</label>
                    <input
                      className="premium-input"
                      placeholder="e.g. BSc Computer Science, UZ"
                      value={step2.education}
                      onChange={(e) => setStep2((prev) => ({ ...prev, education: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Upload mode */}
              {step2.mode === 'upload' && (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 transition hover:border-[var(--border-accent)] hover:bg-[var(--accent)]/[0.02]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type === 'application/pdf') {
                      setStep2((prev) => ({ ...prev, uploadedFileName: file.name }));
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) setStep2((prev) => ({ ...prev, uploadedFileName: file.name }));
                    };
                    input.click();
                  }}
                >
                  <svg className="mb-3 h-10 w-10 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {step2.uploadedFileName ? (
                    <p className="text-sm text-[var(--accent)]">{step2.uploadedFileName}</p>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--text-secondary)]">Drop your PDF here or click to browse</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Maximum file size: 10MB</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="premium-btn premium-btn-secondary mobile-touch pointer-active"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!isStepValid()}
                className="premium-btn premium-btn-primary mobile-touch flex-1 sm:flex-none sm:min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed pointer-active"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Auto-apply settings */}
        {step === 2 && (
          <div className="glass-card animate-fade-in p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Auto-apply settings</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Configure how AetherLink works for you</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Salary floor: <span className="text-[var(--accent)] font-semibold">${step3.salaryFloor}</span> USD
                </label>
                <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={step3.salaryFloor}
                onChange={(e) => setStep3((prev) => ({ ...prev, salaryFloor: Number(e.target.value) }))}
                className="premium-range w-full cursor-pointer"
                />
                <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
                  <span>$0</span>
                  <span>$5,000</span>
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-sm font-medium text-[var(--text-secondary)]">Job types</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleStep3JobType(type)}
                      className={`pill pointer-active ${step3.jobTypes.includes(type) ? 'active' : ''}`}
                      aria-pressed={step3.jobTypes.includes(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Blacklist companies</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {step3.blacklist.map((c) => (
                    <span key={c} className="skill-tag">
                      {c}
                      <button
                        type="button"
                        className="skill-tag-remove"
                        onClick={() => setStep3((prev) => ({ ...prev, blacklist: prev.blacklist.filter((x) => x !== c) }))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="premium-input flex-1"
                    placeholder="Company name"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlacklist())}
                  />
                  <button
                    type="button"
                    onClick={addBlacklist}
                    className="premium-btn premium-btn-primary pointer-active"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[var(--bg-surface)] p-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Auto-apply when match score &gt; X%</p>
                  <p className="text-xs text-[var(--text-muted)]">Currently: {step3.autoApplyThreshold}%</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={step3.autoApplyEnabled}
                    onChange={(e) => setStep3((prev) => ({ ...prev, autoApplyEnabled: e.target.checked }))}
                  />
                  <span className="slider" />
                </label>
              </div>

              {step3.autoApplyEnabled && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Match threshold: {step3.autoApplyThreshold}%</label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={step3.autoApplyThreshold}
                    onChange={(e) => setStep3((prev) => ({ ...prev, autoApplyThreshold: Number(e.target.value) }))}
                    className="premium-range w-full cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="premium-btn premium-btn-secondary mobile-touch pointer-active"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="premium-btn premium-btn-primary mobile-touch flex-1 sm:flex-none sm:min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed pointer-active"
              >
                {loading ? 'Saving…' : 'Start applying'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
