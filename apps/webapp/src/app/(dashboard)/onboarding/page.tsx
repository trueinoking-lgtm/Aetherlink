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

        // Skip advanced matching fetch in debug mode
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
        // In debug mode, skip actual API calls
        writeOnboardingPreferences({
          location: step1.location,
          preferredJobTypes: step3.jobTypes,
          salaryFloor: step3.salaryFloor,
          autoApplyEnabled: step3.autoApplyEnabled,
          autoApplyThreshold: step3.autoApplyThreshold,
          blacklistedCompanies: step3.blacklist,
        });
        router.push('/dashboard');
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

      router.push('/dashboard');
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full transition-colors ${
                  i === step
                    ? 'bg-[var(--accent)] gold-glow'
                    : i < step
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--text-muted)]'
                }`}
              />
              {i < 2 && <div className={`h-px w-8 ${i < step ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Tell us about you */}
        {step === 0 && (
          <div className="glass-card p-6 space-y-5">
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Tell us about you</h1>

            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]">Full name</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                placeholder="Your full name"
                value={step1.fullName}
                onChange={(e) => setStep1((prev) => ({ ...prev, fullName: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]">Location (City)</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                placeholder="e.g. Harare"
                list="zw-cities"
                value={step1.location}
                onChange={(e) => setStep1((prev) => ({ ...prev, location: e.target.value }))}
              />
              <datalist id="zw-cities">
                {ZW_CITIES.map((c) => (<option key={c} value={c} />))}
              </datalist>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--text-secondary)]">Preferred job type</label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleJobType(type)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      step1.jobTypes.includes(type)
                        ? 'bg-[var(--accent)] text-black'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Your CV */}
        {step === 1 && (
          <div className="glass-card p-6 space-y-5">
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Your CV</h1>

            {/* Mode toggle */}
            <div className="flex gap-2 rounded-lg bg-[var(--bg-surface)] p-1">
              <button
                type="button"
                onClick={() => setStep2((prev) => ({ ...prev, mode: 'build' }))}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  step2.mode === 'build'
                    ? 'bg-[var(--accent)] text-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Build it here
              </button>
              <button
                type="button"
                onClick={() => setStep2((prev) => ({ ...prev, mode: 'upload' }))}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  step2.mode === 'upload'
                    ? 'bg-[var(--accent)] text-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Upload PDF
              </button>
            </div>

            {/* CV strength indicator */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">CV Strength:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-4 w-4 ${star <= cvStars ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
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
                  <label className="mb-1 block text-sm text-[var(--text-secondary)]">Current role</label>
                  <input
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    placeholder="e.g. Software Engineer"
                    value={step2.currentRole}
                    onChange={(e) => setStep2((prev) => ({ ...prev, currentRole: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[var(--text-secondary)]">Skills</label>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {step2.skills.map((s) => (
                      <span key={s} className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs text-[var(--accent)]">
                        {s}
                        <button
                          type="button"
                          className="ml-1.5 text-[var(--accent-dim)] hover:text-[var(--accent)]"
                          onClick={() => setStep2((prev) => ({ ...prev, skills: prev.skills.filter((x) => x !== s) }))}
                        >
                          ×
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

                <div>
                  <label className="mb-1 block text-sm text-[var(--text-secondary)]">Years of experience</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    placeholder="e.g. 3"
                    value={step2.experienceYears}
                    onChange={(e) => setStep2((prev) => ({ ...prev, experienceYears: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[var(--text-secondary)]">Education</label>
                  <input
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
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
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 transition hover:border-[var(--accent-dim)]"
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
        )}

        {/* Step 3: Auto-apply settings */}
        {step === 2 && (
          <div className="glass-card p-6 space-y-5">
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Auto-apply settings</h1>

            <div>
              <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                Salary floor: <span className="text-[var(--accent)] font-medium">${step3.salaryFloor}</span> USD
              </label>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={step3.salaryFloor}
                onChange={(e) => setStep3((prev) => ({ ...prev, salaryFloor: Number(e.target.value) }))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
                <span>$0</span>
                <span>$5,000</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--text-secondary)]">Job types</label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleStep3JobType(type)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      step3.jobTypes.includes(type)
                        ? 'bg-[var(--accent)] text-black'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]">Blacklist companies</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {step3.blacklist.map((c) => (
                  <span key={c} className="rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1 text-xs text-[var(--danger)]">
                    {c}
                    <button
                      type="button"
                      className="ml-1.5 hover:text-[var(--danger)]"
                      onClick={() => setStep3((prev) => ({ ...prev, blacklist: prev.blacklist.filter((x) => x !== c) }))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  placeholder="Company name"
                  value={blacklistInput}
                  onChange={(e) => setBlacklistInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlacklist())}
                />
                <button
                  type="button"
                  onClick={addBlacklist}
                  className="rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-black hover:brightness-110"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Auto-apply when match score{'>'} X%</p>
                <p className="text-xs text-[var(--text-muted)]">Currently: {step3.autoApplyThreshold}%</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={step3.autoApplyEnabled}
                  onChange={(e) => setStep3((prev) => ({ ...prev, autoApplyEnabled: e.target.checked }))}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-[var(--bg-raised)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-[var(--text-muted)] after:transition-all peer-checked:bg-[var(--accent)]/40 peer-checked:after:translate-x-full peer-checked:after:bg-[var(--accent)]" />
              </label>
            </div>

            {step3.autoApplyEnabled && (
              <div>
                <label className="mb-1 block text-sm text-[var(--text-secondary)]">Match threshold: {step3.autoApplyThreshold}%</label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={step3.autoApplyThreshold}
                  onChange={(e) => setStep3((prev) => ({ ...prev, autoApplyThreshold: Number(e.target.value) }))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-dim)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!isStepValid()}
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Saving…' : 'Start applying'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}