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
      className="block rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--accent-dim)]"
    >
      <div className="flex items-start justify-between gap-3">
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
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(job.repost_count ?? 0) > 1 && (
          <span className="rounded bg-[var(--accent-dim)]/30 px-2 py-0.5 text-xs text-[var(--warning)]">
            Reposted {job.repost_count}×
          </span>
        )}
        {windowLeft != null && windowLeft > 0 && (
          <span className="rounded bg-[var(--accent-dim)]/20 px-2 py-0.5 text-xs text-[var(--accent)]">
            ⚡ {windowLeft}h left
          </span>
        )}
      </div>
    </Link>
  );
}
