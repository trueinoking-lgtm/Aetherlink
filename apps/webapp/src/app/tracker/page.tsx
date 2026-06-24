'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';

type AppRow = {
  id: string;
  cover_letter?: string;
  outcome?: string;
  created_at: string;
  jobs?: { title: string; companyName: string; hr_email?: string };
};

const OUTCOMES = [
  { id: 'still_waiting', label: 'Still waiting' },
  { id: 'interview', label: 'Got an interview' },
  { id: 'offer', label: 'Got an offer' },
  { id: 'no_response', label: 'No response' },
];

export default function TrackerPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const [apps, setApps] = useState<AppRow[]>([]);

  useEffect(() => {
    void sdk.listApplications().then((rows: unknown[]) => setApps(rows as AppRow[]));
  }, [sdk]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <Link href="/feed" className="group inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition hover:text-[var(--accent-hover)]">
          <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Jobs
        </Link>
        <h1 className="font-display mt-2 text-xl font-bold">Application Tracker</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {apps.length === 0 && (
          <div className="glass-card p-8 text-center">
            <div className="empty-state-icon mx-auto">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">No applications yet</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Start applying to jobs and track them here.</p>
            <Link href="/feed" className="mt-4 inline-flex premium-btn premium-btn-primary pointer-active">
              Browse Jobs
            </Link>
          </div>
        )}
        {apps.map((app) => (
          <div
            key={app.id}
            className="glass-card p-5"
          >
            <h3 className="font-display font-bold text-[var(--text-primary)]">{app.jobs?.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{app.jobs?.companyName}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Applied {new Date(app.created_at).toLocaleDateString()}
            </p>
            {!app.outcome && (
              <div className="mt-4">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Did you hear back?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="pill pointer-active"
                      onClick={() =>
                        void sdk
                          .recordApplicationOutcome({ applicationId: app.id, outcome: o.id })
                          .then(() =>
                            setApps((prev) =>
                              prev.map((a) =>
                                a.id === app.id ? { ...a, outcome: o.id } : a,
                              ),
                            ),
                          )
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {app.outcome && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--accent-glow)] px-3 py-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-[var(--accent-hover)]">Outcome: {app.outcome}</p>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
