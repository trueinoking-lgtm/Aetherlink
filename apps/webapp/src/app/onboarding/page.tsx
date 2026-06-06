'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CvDraft } from '@aetherlink/core';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import { emptyCvDraft, loadCvDraft, saveCvDraft } from '@/lib/cvStorage';

const ZW_SKILLS = [
  'Accounting',
  'Excel',
  'QuickBooks',
  'CCNA',
  'Python',
  'Customer Service',
  'Sales',
];

export default function OnboardingPage() {
  const router = useRouter();
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const [step, setStep] = useState(0);
  const [cv, setCv] = useState<CvDraft>(emptyCvDraft());

  useEffect(() => {
    void loadCvDraft().then((d) => {
      if (d) setCv(d);
    });
  }, []);

  const persist = (next: CvDraft) => {
    setCv(next);
    void saveCvDraft(next);
  };

  async function finish() {
    await sdk.updateAetherLinkProfile({
      full_name: cv.fullName,
      headline: cv.headline,
      skills: cv.skills,
      certifications: cv.certifications,
    });
    router.push('/feed');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] p-6 text-[var(--text-primary)]">
      <p className="font-mono text-xs text-[var(--accent)]">Step {step + 1} of 4</p>
      {step === 0 && (
        <div className="mt-6 space-y-4">
          <h1 className="font-display text-2xl font-bold">Welcome to AetherLink</h1>
          <input
            className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            placeholder="Full name"
            value={cv.fullName}
            onChange={(e) => persist({ ...cv, fullName: e.target.value })}
          />
          <input
            className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            placeholder="Professional headline"
            value={cv.headline}
            onChange={(e) => persist({ ...cv, headline: e.target.value })}
          />
        </div>
      )}
      {step === 1 && (
        <div className="mt-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Your skills</h2>
          <div className="flex flex-wrap gap-2">
            {ZW_SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                className={`rounded px-3 py-1 text-sm ${cv.skills.includes(s) ? 'bg-[var(--accent)] text-black' : 'border border-[var(--border)]'}`}
                onClick={() =>
                  persist({
                    ...cv,
                    skills: cv.skills.includes(s)
                      ? cv.skills.filter((x) => x !== s)
                      : [...cv.skills, s],
                  })
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="mt-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Certifications</h2>
          <input
            className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            placeholder="e.g. ACCA Part 1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) persist({ ...cv, certifications: [...cv.certifications, v] });
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            {cv.certifications.map((c) => (
              <span key={c} className="rounded bg-[var(--bg-raised)] px-2 py-1 text-sm">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="mt-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Experience</h2>
          <input
            className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            placeholder="Role"
            value={cv.experience[0]?.role ?? ''}
            onChange={(e) => {
              const exp = [...cv.experience];
              exp[0] = { ...exp[0], role: e.target.value };
              persist({ ...cv, experience: exp });
            }}
          />
          <input
            className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            placeholder="Company"
            value={cv.experience[0]?.company ?? ''}
            onChange={(e) => {
              const exp = [...cv.experience];
              exp[0] = { ...exp[0], company: e.target.value };
              persist({ ...cv, experience: exp });
            }}
          />
          <textarea
            className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            placeholder="Bullet points (one per line)"
            rows={4}
            value={cv.experience[0]?.bullets.join('\n') ?? ''}
            onChange={(e) => {
              const exp = [...cv.experience];
              exp[0] = {
                ...exp[0],
                bullets: e.target.value.split('\n').filter(Boolean),
              };
              persist({ ...cv, experience: exp });
            }}
          />
        </div>
      )}
      <div className="mt-auto flex gap-3 pt-8">
        {step > 0 && (
          <button
            type="button"
            className="rounded border border-[var(--border)] px-4 py-2"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            className="rounded bg-[var(--accent)] px-6 py-2 font-medium text-black"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="rounded bg-[var(--accent)] px-6 py-2 font-medium text-black"
            onClick={finish}
          >
            Start applying
          </button>
        )}
      </div>
    </div>
  );
}
