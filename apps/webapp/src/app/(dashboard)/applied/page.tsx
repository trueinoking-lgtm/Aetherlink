'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  outcome?: string;
  jobs?: { title: string; companyName: string };
};

const STATUS_CHIPS: Record<string, { label: string; color: string }> = {
  sent: { label: 'Sent', color: 'text-[var(--accent)] bg-[var(--accent)]/10' },
  opened: { label: 'Opened', color: 'text-[var(--match-mid)] bg-[var(--match-mid)]/10' },
  responded: { label: 'Responded', color: 'text-[var(--match-high)] bg-[var(--match-high)]/10' },
};

export default function AppliedPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const apps = (await sdk.listApplications()) as unknown[];
        setApplications(
          (apps as ApplicationRow[]).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        );
      } catch (e) {
        console.error('Applications load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading applications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Applications</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {applications.length} {applications.length === 1 ? 'application' : 'applications'} sent
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 p-12 text-center">
          <div className="empty-state-icon mx-auto">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">No applications yet</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Start applying to jobs and track them here.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link href="/feed" className="premium-btn premium-btn-primary pointer-active">
              Browse Jobs
            </Link>
            <Link href="/cv" className="premium-btn premium-btn-secondary pointer-active">
              Update CV
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--accent)]/40 via-[var(--accent)]/20 to-transparent" />

          <div className="space-y-6">
            {applications.map((app) => {
              const status = STATUS_CHIPS[app.status ?? 'sent'] ?? STATUS_CHIPS.sent;
              return (
                <div key={app.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-8 top-2 h-6 w-6 rounded-full border-2 border-[var(--accent)] bg-[var(--bg-base)]">
                    <div className="ml-[3px] mt-[3px] h-3.5 w-3.5 rounded-full bg-[var(--accent)]" />
                  </div>

                  {/* Card */}
                  <div className="glass-card hover-lift p-4 transition-all hover:border-[var(--border-accent)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {app.jobs?.title ?? 'Unknown Job'}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {app.jobs?.companyName ?? 'Unknown Company'}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {new Date(app.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
