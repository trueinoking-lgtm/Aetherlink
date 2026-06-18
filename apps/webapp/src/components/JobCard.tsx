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
      ? 'text-[var(--match-high)]'
      : score && score.score >= 40
        ? 'text-[var(--match-mid)]'
        : 'text-[var(--match-low)]';

  const barColor =
    score && score.score >= 70
      ? 'high'
      : score && score.score >= 40
        ? 'mid'
        : 'low';

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
      className="glass-card hover-lift group block p-4 relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-hover)] transition-colors">{job.title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {job.companyName}
            {job.employer_verified && (
              <span className="ml-1.5 text-[var(--success)]" title="Verified employer" aria-label="Verified employer">
                ✓
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {job.location && <span>{job.location} · </span>}
            {getRelativeTimeString(new Date(job.created_at))}
          </p>
        </div>
        {score && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`job-card-match-badge ${barColor}`}>
              {score.score}%
            </span>
          </div>
        )}
      </div>
      {/* Score bar */}
      {score && (
        <div className="mt-3 flex items-center gap-2">
          <div className="score-bar score-bar-sm flex-1 max-w-[120px] overflow-hidden rounded-full">
            <div className={`score-bar-fill ${barColor}`} style={{ '--score-width': `${Math.max(score.score, 0)}%` } as React.CSSProperties} />
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(job.repost_count ?? 0) > 1 && (
          <span className="badge badge-mid">
            Reposted {job.repost_count}×
          </span>
        )}
        {windowLeft != null && windowLeft > 0 && (
          <span className="badge badge-high">
            {windowLeft}h left
          </span>
        )}
      </div>
      <svg className="absolute right-4 top-4 h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
