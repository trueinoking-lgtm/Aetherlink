'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Job, Profile } from '@aetherlink/core';
import { computeMatchScore } from '@/lib/scoring';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const isDebug = window.location.search.includes('debug=true');
      try {
        let user, prof, feed, apps;
        if (isDebug) {
          [user, prof, feed, apps] = await Promise.all([
            sdk.getUser(),
            sdk.getAetherLinkProfile(),
            sdk.listFeedJobs({ limit: 10 }),
            sdk.listApplications(),
          ]);
        } else {
          user = await sdk.getUser();
          if (!user) { router.push('/'); return; }
          [prof, feed, apps] = await Promise.all([
            sdk.getAetherLinkProfile(),
            sdk.listFeedJobs({ limit: 10 }),
            sdk.listApplications(),
          ]);
        }
        setProfile(prof ?? null);
        setJobs(feed.jobs);
        setApplications(apps);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk, router]);

  const skills = profile?.skills ?? [];
  const avgMatch =
    jobs.length > 0
      ? Math.round(
          jobs.reduce((sum, j) => sum + computeMatchScore(j.title, j.raw_text, skills), 0) /
            jobs.length,
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          {getGreeting()}, {profile?.full_name ?? 'there'}
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">Here's your job search overview.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-sm text-[var(--text-muted)]">Jobs seen today</p>
          <p className="mt-1 font-display text-3xl font-bold text-[var(--text-primary)]">{jobs.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-[var(--text-muted)]">Applications sent</p>
          <p className="mt-1 font-display text-3xl font-bold text-[var(--accent)]">{applications.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-[var(--text-muted)]">Avg match score</p>
          <p className="mt-1 font-display text-3xl font-bold text-[var(--text-primary)]">
            {avgMatch > 0 ? `${avgMatch}%` : '\u2014'}
          </p>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="section-heading">Recent activity</h2>
        {jobs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--text-secondary)]">No jobs matching your profile yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => {
              const score = computeMatchScore(job.title, job.raw_text, skills);
              const scoreColor =
                score >= 80
                  ? 'text-[var(--match-high)]'
                  : score >= 50
                  ? 'text-[var(--match-mid)]'
                  : 'text-[var(--match-low)]';
              return (
                <Link
                  key={job.id}
                  href={`/feed/${job.id}`}
                  className="glass-card flex items-center justify-between p-4 transition hover:border-[var(--accent-dim)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">{job.title}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {job.companyName}
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        {job.location ?? ''}
                      </span>
                    </p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-bold ${scoreColor}`}>
                    {score}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/feed"
          className="premium-btn premium-btn-primary"
        >
          View Jobs
        </Link>
        <Link
          href="/cv"
          className="premium-btn premium-btn-secondary"
        >
          My CV
        </Link>
        <Link
          href="/applied"
          className="premium-btn premium-btn-secondary"
        >
          Applications
        </Link>
      </div>
    </div>
  );
}