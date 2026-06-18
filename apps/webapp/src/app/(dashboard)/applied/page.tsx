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

const STATUS_CHIPS: Record<string, { label: string; className: string }> = {
  sent: { label: 'Sent', className: 'badge badge-mid' },
  opened: { label: 'Opened', className: 'badge badge-high' },
  responded: { label: 'Responded', className: 'badge badge-high' },
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
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Applications</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {applications.length} {applications.length === 1 ? 'application' : 'applications'} sent
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 p-10 text-center">
          <div className="empty-state-icon mx-auto shrink-0">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">No applications yet</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">
              Start applying to jobs and track them here. Your application history will appear as a timeline.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Link href="/feed" className="premium-btn premium-btn-primary pointer-active">
              Browse Jobs
            </Link>
            <Link href="/cv" className="premium-btn premium-btn-secondary pointer-active">
              Update CV
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] sm:left-[15px] top-6 bottom-6 w-px bg-gradient-to-b from-[var(--accent)]/40 via-[var(--accent)]/15 to-transparent" aria-hidden="true" />

          <div className="space-y-4 pl-8 sm:pl-10">
            {applications.map((app) => {
              const status = STATUS_CHIPS[app.status ?? 'sent'] ?? STATUS_CHIPS.sent;
              return (
                <div key={app.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-8 sm:-left-10 top-5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-base)]">
                    <div className="h-3 w-3 rounded-full bg-[var(--accent)] ring-2 ring-[var(--accent)]/20" />
                  </div>

                  {/* Card */}
                  <div className="glass-card hover-lift p-5 transition-all hover:border-[var(--border-accent)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {app.jobs?.title ?? 'Unknown Job'}
                        </p>
                        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                          {app.jobs?.companyName ?? 'Unknown Company'}
                        </p>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          {new Date(app.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`shrink-0 ${status.className}`}>
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
