'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Job, Profile } from '@aetherlink/core';
import { computeMatchScore } from '@/lib/scoring';

function ScoreCircle({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorVar =
    score >= 70
      ? 'var(--match-high)'
      : score >= 40
        ? 'var(--match-mid)'
        : 'var(--match-low)';
  const label =
    score >= 70
      ? 'Strong match'
      : score >= 40
        ? 'Good match'
        : 'Low match';
  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`${score}% match: ${label}`}>
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-ring-circle"
            style={{ '--score-color': colorVar } as React.CSSProperties}
          />
        </svg>
        <span className="absolute font-display text-2xl font-bold text-[var(--text-primary)] animate-fade-in">
          {score}%
        </span>
      </div>
      <span className="text-xs font-medium" style={{ color: colorVar }}>
        {label}
      </span>
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = Number(id);
  const sdk = useSdk() as AetherLinkSupabaseApi;

  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [j, prof] = await Promise.all([
          sdk.getFeedJob(jobId),
          sdk.getAetherLinkProfile(),
        ]);
        setJob(j);
        setProfile(prof ?? null);
      } catch (e) {
        console.error('Job detail load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk, jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading job details…</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[var(--text-secondary)]">Job not found.</p>
        <Link href="/feed" className="mt-4 text-sm text-[var(--accent)] hover:underline">
          &larr; Back to Jobs
        </Link>
      </div>
    );
  }

  const skills = profile?.skills ?? [];
  const score = computeMatchScore(job.title, job.raw_text, skills);
  const requirements = job.requirements ?? [];
  const matchedSkills = requirements.filter((r) =>
    skills.some((s) => r.toLowerCase().includes(s.toLowerCase())),
  );
  const missingSkills = requirements.filter(
    (r) => !skills.some((s) => r.toLowerCase().includes(s.toLowerCase())),
  );

  return (
    <div className="space-y-5 page-enter">
      {/* Back link */}
      <Link
        href="/feed"
        className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--accent-hover)]"
      >
        <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Jobs
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: job description */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              {job.title}
            </h1>
            <p className="mt-1 text-lg text-[var(--text-secondary)]">{job.companyName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
              <span>
                {new Date(job.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {job.location && (
                <>
                  <span>&middot;</span>
                  <span>{job.location}</span>
                </>
              )}
              {job.jobType && (
                <>
                  <span>&middot;</span>
                  <span className="capitalize">{job.jobType}</span>
                </>
              )}
            </div>
            {/* Quick badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {job.jobType && (
                <span className="badge badge-mid">
                  {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}
                </span>
              )}
              {job.salary && (
                <span className="badge badge-high">
                  {job.salary}
                </span>
              )}
              {job.employer_verified && (
                <span className="badge badge-high">✓ Verified</span>
              )}
            </div>
          </div>

          {/* Job description */}
          {job.description ? (
            <div className="job-description-md rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              {job.description.replace(/<[^>]+>/g, '').split('\n').filter(line => line.trim()).map((line, i) => (
                <p key={i} className="mb-2.5 last:mb-0">{line}</p>
              ))}
            </div>
          ) : job.raw_text ? (
            <div className="job-description-md rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              {job.raw_text.split('\n').filter(line => line.trim()).map((line, i) => (
                <p key={i} className="mb-2.5 last:mb-0">{line}</p>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <p className="text-sm text-[var(--text-muted)]">No description available for this job yet.</p>
            </div>
          )}

          {/* Salary and metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {job.salary && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4">
                <p className="text-xs font-medium text-[var(--text-muted)]">Salary</p>
                <p className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">{job.salary}</p>
              </div>
            )}
            {job.jobType && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4">
                <p className="text-xs font-medium text-[var(--text-muted)]">Job Type</p>
                <p className="mt-1 font-display text-lg font-semibold capitalize text-[var(--text-primary)]">
                  {job.jobType}
                </p>
              </div>
            )}
            {job.location && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4">
                <p className="text-xs font-medium text-[var(--text-muted)]">Location</p>
                <p className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">{job.location}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: sticky action panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-5">
            {/* Match score */}
            <div className="glass-card flex flex-col items-center gap-3 p-6">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Match Score
              </p>
              {skills.length > 0 ? (
                <ScoreCircle score={score} />
              ) : (
                <span className="text-sm text-[var(--text-muted)]">
                  Add skills to your CV to see your match score
                </span>
              )}
            </div>

            {/* Skills breakdown */}
            {requirements.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">
                  Skills Breakdown
                </h3>
                {matchedSkills.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-[var(--success)]">
                      Matched
                    </p>
                    <ul className="space-y-1">
                      {matchedSkills.map((s) => (
                        <li
                          key={s}
                          className="rounded-md bg-[var(--success-bg)] px-2.5 py-1 text-xs text-[var(--success)]"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {missingSkills.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">
                      Missing
                    </p>
                    <ul className="space-y-1">
                      {missingSkills.map((s) => (
                        <li
                          key={s}
                          className="rounded-md bg-[var(--bg-raised)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Apply button */}
            {job.hr_email ? (
              <a
                href={`mailto:${job.hr_email}?subject=Application for ${encodeURIComponent(job.title)}`}
                className="premium-btn premium-btn-primary w-full pointer-active"
              >
                Apply Now
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--success)]/30 bg-[var(--success-bg)] px-4 py-2.5 text-sm font-medium text-[var(--success)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Auto-applied
              </div>
            )}

            {/* Company info */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dim)] text-sm font-bold text-[var(--text-primary)]">
                  {job.companyName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    {job.companyName}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {job.employer_verified ? (
                      <span className="text-[var(--success)]">✓ Verified employer</span>
                    ) : (
                      'Company information pending'
                    )}
                  </p>
                </div>
              </div>
              {job.source_group && (
                <p className="text-xs text-[var(--text-muted)]">
                  Source: {job.source_group}
                </p>
              )}
            </div>

            {/* Back to jobs link */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <Link
                href="/feed"
                className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Browse more jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
