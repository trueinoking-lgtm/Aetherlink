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

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="glass-card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg-raised)]'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
        <p className={`mt-0.5 font-display text-2xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
          {value}
        </p>
      </div>
    </div>
  );
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {getGreeting()}, {profile?.full_name ?? 'there'}
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">Here&rsquo;s your job search overview.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Jobs seen today"
          value={jobs.length}
          icon={
            <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          }
        />
        <StatCard
          label="Applications sent"
          value={applications.length}
          accent
          icon={
            <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Avg match score"
          value={avgMatch > 0 ? `${avgMatch}%` : '—'}
          icon={
            <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="section-heading">Recent activity</h2>
        {jobs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--text-secondary)]">No jobs matching your profile yet.</p>
            <Link href="/feed" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
              Browse all jobs →
            </Link>
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
                  className="glass-card flex items-center justify-between p-4 transition-all hover:border-[var(--border-accent)] hover:bg-[var(--accent)]/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">{job.title}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {job.companyName}
                      {job.location && (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          {job.location}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`ml-4 shrink-0 font-mono text-sm font-bold ${scoreColor}`}>
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
        <Link href="/feed" className="premium-btn premium-btn-primary">
          View Jobs
        </Link>
        <Link href="/cv" className="premium-btn premium-btn-secondary">
          My CV
        </Link>
        <Link href="/applied" className="premium-btn premium-btn-secondary">
          Applications
        </Link>
      </div>
    </div>
  );
}
