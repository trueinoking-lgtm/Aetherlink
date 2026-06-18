'use client';

import Link from 'next/link';
import { getRelativeTimeString, scoreMatch, type FeedJob, type CvDraft } from '@aetherlink/core';

export function JobCard({ job, profile }: { job: FeedJob; profile: CvDraft | null }) {
  const requirements = job.requirements ?? [];
  const score = profile
    ? scoreMatch(
        requirements,
        profile.skills,
        profile.certifications,
        profile.experience.flatMap((e) => e.bullets),
      )
    : null;

  const scoreColor =
    score && score.score >= 70
      ? 'text-[var(--success)]'
      : score && score.score >= 40
        ? 'text-[var(--warning)]'
        : 'text-[var(--danger)]';

  const windowLeft = job.opportunity_window_expires_at
    ? Math.max(
        0,
        Math.round(
          (new Date(job.opportunity_window_expires_at).getTime() - Date.now()) / (1000 * 60 * 60),
        ),
      )
    : null;

  return (
    <Link
      href={`/feed/${job.id}`}
      className="glass-card hover-lift group block p-4"
    >
      <div className="flex items-start justify-between gap-3 pr-10">
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">{job.title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {job.companyName}
            {job.employer_verified && (
              <span className="ml-2 text-[var(--success)]" title="Verified employer">
                ✓
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {getRelativeTimeString(new Date(job.created_at))}
          </p>
        </div>
        {score && (
          <span className={`font-mono text-sm font-medium ${scoreColor}`}>{score.score}%</span>
        )}
        <svg className="absolute right-4 top-4 h-4 w-4 text-[var(--text-muted)] transition group-hover:text-[var(--accent-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(job.repost_count ?? 0) > 1 && (
          <span className="rounded bg-[var(--accent-glow)] px-2 py-0.5 text-xs text-[var(--warning)]">
            Reposted {job.repost_count}×
          </span>
        )}
        {windowLeft != null && windowLeft > 0 && (
          <span className="rounded bg-[var(--accent-glow)] px-2 py-0.5 text-xs text-[var(--accent)]">
            ⚡ {windowLeft}h left
          </span>
        )}
      </div>
    </Link>
  );
}
