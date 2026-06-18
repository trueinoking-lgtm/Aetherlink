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
        <Link href="/feed" className="text-sm text-[var(--accent)]">
          ← Feed
        </Link>
        <h1 className="font-display mt-2 text-xl font-bold">Application Tracker</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {apps.length === 0 && (
          <p className="text-[var(--text-secondary)]">No applications yet.</p>
        )}
        {apps.map((app) => (
          <div
            key={app.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4"
          >
            <h3 className="font-display font-bold">{app.jobs?.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{app.jobs?.companyName}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Applied {new Date(app.created_at).toLocaleDateString()}
            </p>
            {!app.outcome && (
              <div className="mt-4">
                <p className="text-sm text-[var(--text-secondary)]">Did you hear back?</p>
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
              <p className="mt-2 text-sm text-[var(--accent)]">Outcome: {app.outcome}</p>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
