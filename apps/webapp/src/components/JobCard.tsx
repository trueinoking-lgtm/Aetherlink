'use client';

import Link from 'next/link';
import { scoreMatch, type FeedJob } from '@aetherlink/core';

function getEmployerName(companyName?: string | null): string {
  const value = companyName?.trim();

  if (
    !value ||
    value.toLowerCase() === "unknown employer" ||
    value.toLowerCase() === "companies"
  ) {
    return "Employer not disclosed";
  }

  return value;
}

function formatClosingDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    return `Closes ${date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })}`;
  } catch {
    return '';
  }
}

export default function JobCard({ job }: { job: FeedJob }) {

  const requirements = job.requirements ?? [];
  const matchScore = scoreMatch(requirements, [], [], []);

  const employerName = getEmployerName(job.companyName);
  const closingDateDisplay = formatClosingDate(job.closing_date);
  const location = job.location || '';
  const employmentType = job.employment_type || '';
  const category = job.category || '';

  const hasScorableContent = Boolean(job.requirements?.length) || Boolean(job.responsibilities?.length);

  return (
    <Link
      href={`/feed/${job.id}`}
      className="glass-card hover-lift group block p-4 relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-hover)] transition-colors">
            {job.title || "Untitled position"}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {employerName}
            {job.employer_verified && (
              <span className="ml-1.5 text-[var(--success)]" title="Verified employer" aria-label="Verified employer">
                ✓
              </span>
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--text-secondary)]">
            {location && <span>{location}</span>}
            {employmentType && <span>{employmentType}</span>}
            {category && <span>{category}</span>}
            {closingDateDisplay && <span>{closingDateDisplay}</span>}
          </div>
        </div>

        <div className="text-right">
          {!hasScorableContent || !matchScore?.score ? (
            <span className="text-xs text-[var(--text-tertiary)]">Not scored</span>
          ) : (
            <div className="inline-flex flex-col items-end">
              <span className={`text-sm font-semibold ${
                matchScore.score >= 70
                  ? 'text-[var(--match-high)]'
                  : matchScore.score >= 40
                  ? 'text-[var(--match-mid)]'
                  : 'text-[var(--match-low)]'
              }`}>
                {matchScore.score}%
              </span>
              <div className="h-1 w-12 rounded-full bg-[var(--match-empty)] mt-1">
                <div
                  className={`h-full rounded-full ${
                    matchScore.score >= 70
                      ? 'bg-[var(--match-high)]'
                      : matchScore.score >= 40
                      ? 'bg-[var(--match-mid)]'
                      : 'bg-[var(--match-low)]'
                  }`}
                  style={{ width: `${matchScore.score}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}