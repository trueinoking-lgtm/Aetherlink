'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AppliedJob = {
  id: number;
  title: string;
  companyName: string;
  appliedAt: string;
};

export default function AppliedPage() {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('aetherlink_appliedJobs') || '[]');
      // For now just show IDs — in future, fetch job details from Supabase
      setAppliedJobs(
        stored.map((id: number) => ({
          id,
          title: `Job #${id}`,
          companyName: '',
          appliedAt: new Date().toISOString(),
        }))
      );
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const removeJob = (jobId: number) => {
    try {
      const stored = JSON.parse(localStorage.getItem('aetherlink_appliedJobs') || '[]');
      const next = stored.filter((id: number) => id !== jobId);
      localStorage.setItem('aetherlink_appliedJobs', JSON.stringify(next));
      setAppliedJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading tracker…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Application tracker</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {appliedJobs.length} {appliedJobs.length === 1 ? 'job' : 'jobs'} marked as applied
        </p>
      </div>

      {appliedJobs.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 p-10 text-center">
          <div className="empty-state-icon mx-auto shrink-0">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">No applications tracked yet</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">
              Browse jobs and use the &quot;Mark as applied&quot; button to track your applications here.
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
        <div className="space-y-3">
          {appliedJobs.map((job) => (
            <div key={job.id} className="glass-card hover-lift p-5 transition-all hover:border-[var(--border-accent)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    {job.title}
                  </p>
                  {job.companyName && (
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                      {job.companyName}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Marked on {new Date(job.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/feed/${job.id}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => removeJob(job.id)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    aria-label="Remove from tracker"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
