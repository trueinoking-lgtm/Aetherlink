'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { JobCard } from '@/components/JobCard';
import { loadCvDraft } from '@/lib/cvStorage';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { CvDraft, Job } from '@aetherlink/core';

export default function FeedPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cv, setCv] = useState<CvDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [feed, draft] = await Promise.all([
          sdk.listFeedJobs({ limit: 50 }),
          loadCvDraft(),
        ]);
        setJobs(feed.jobs);
        setCv(draft);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Aether<span className="text-[var(--accent)]">Link</span>
          </h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/cv" className="text-[var(--text-secondary)] hover:text-[var(--accent)]">
              CV
            </Link>
            <Link href="/tracker" className="text-[var(--text-secondary)] hover:text-[var(--accent)]">
              Tracker
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {loading && <p className="text-[var(--text-muted)]">Loading feed…</p>}
        {!loading && jobs.length === 0 && (
          <p className="text-center text-[var(--text-secondary)]">
            No new jobs right now. Check back soon.
          </p>
        )}
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} profile={cv} />
        ))}
      </main>
    </div>
  );
}
