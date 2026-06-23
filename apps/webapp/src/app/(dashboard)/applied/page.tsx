'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type TrackedJob = {
  job_id: number;
  job_title: string;
  job_company: string;
  job_location: string;
  job_closing_date: string;
  job_source_group: string;
  saved_at: string;
  applied_at: string | null;
  notes: string | null;
};

export default function AppliedPage() {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'saved' | 'applied'>('all');

  const supabase = createClient();

  useEffect(() => {
    void (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('list_saved_jobs');
        if (error) throw error;
        setJobs(data ?? []);
      } catch (e) {
        console.error('Failed to load saved jobs:', e);
        // Fallback to localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('aetherlink_appliedJobs') || '[]');
          setJobs(
            stored.map((id: number) => ({
              job_id: id,
              job_title: `Job #\${id}`,
              job_company: '',
              job_location: '',
              job_closing_date: '',
              job_source_group: '',
              saved_at: new Date().toISOString(),
              applied_at: new Date().toISOString(),
              notes: null,
            })),
          );
        } catch { /* ignore */ }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const removeJob = async (jobId: number) => {
    // Remove from Supabase
    try {
      await (supabase as any)
        .from('saved_jobs')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
    } catch { /* ignore */ }
    // Remove from localStorage fallback
    try {
      const stored = JSON.parse(localStorage.getItem('aetherlink_appliedJobs') || '[]');
      const next = stored.filter((id: number) => id !== jobId);
      localStorage.setItem('aetherlink_appliedJobs', JSON.stringify(next));
    } catch { /* ignore */ }
    setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'saved') return !j.applied_at;
    if (filter === 'applied') return !!j.applied_at;
    return true;
  });

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
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} tracked
          {jobs.filter((j) => j.applied_at).length > 0 && ` · \${jobs.filter((j) => j.applied_at).length} applied`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'saved', 'applied'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all pointer-active \${
              filter === f
                ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--glass-bg-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'saved' ? 'Saved' : 'Applied'}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 p-10 text-center">
          <div className="empty-state-icon mx-auto shrink-0">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">
              {filter === 'applied' ? 'No applied jobs yet' : filter === 'saved' ? 'No saved jobs yet' : 'No jobs tracked yet'}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">
              Browse jobs and use the &quot;Save job&quot; or &quot;Mark as applied&quot; buttons to track them here.
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
          {filteredJobs.map((job) => (
            <div key={job.job_id} className="glass-card hover-lift p-5 transition-all hover:border-[var(--border-accent)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    {job.job_title}
                  </p>
                  {job.job_company && (
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                      {job.job_company}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {job.job_source_group && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--glass-bg-subtle)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--text-muted)]">
                        Source: {job.job_source_group}
                      </span>
                    )}
                    {job.applied_at && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--success)]">
                        Applied {new Date(job.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {job.job_closing_date && (
                      <span className="text-[0.6875rem] text-[var(--text-muted)]">
                        Closes {new Date(job.job_closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/feed/\${job.job_id}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => removeJob(job.job_id)}
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
