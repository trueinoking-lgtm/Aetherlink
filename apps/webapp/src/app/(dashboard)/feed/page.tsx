'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Job, Profile } from '@aetherlink/core';
import { computeMatchScore } from '@/lib/scoring';
import { createClient } from '@/lib/supabase/client';

const JOB_TYPES = ['remote', 'hybrid', 'onsite'] as const;

function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="space-y-3 p-5">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-5 w-16" />
          <div className="skeleton h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<string>('');
  const [salaryRange, setSalaryRange] = useState<string>('');
  const [datePosted, setDatePosted] = useState<string>('');
  const [suitedForMe, setSuitedForMe] = useState(false);

  useEffect(() => {
    void (async () => {
      const isDebug = window.location.search.includes('debug=true');
      try {
        let feed, prof;
        if (isDebug) {
          [feed, prof] = await Promise.all([
            sdk.listFeedJobs({ limit: 200 }),
            sdk.getAetherLinkProfile(),
          ]);
        } else {
          const { data } = await supabase.auth.getUser();
          if (!data?.user) {
            setLoading(false);
            return;
          }
          [feed, prof] = await Promise.all([
            sdk.listFeedJobs({ limit: 200 }),
            sdk.getAetherLinkProfile(),
          ]);
        }
        setJobs(feed.jobs);
        setFilteredJobs(feed.jobs);
        setProfile(prof ?? null);
      } catch (e) {
        console.error('Feed load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk, supabase]);

  const skills = profile?.skills ?? [];
  const autoThreshold = 80;

  // Apply filters
  useEffect(() => {
    let result = [...jobs];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.companyName.toLowerCase().includes(q),
      );
    }

    if (jobType) {
      result = result.filter((j) => j.jobType === jobType);
    }

    if (salaryRange) {
      result = result.filter((j) => {
        if (!j.salary) return false;
        const num = parseInt(j.salary.replace(/[^0-9]/g, ''), 10);
        if (isNaN(num)) return false;
        switch (salaryRange) {
          case '0-1000':
            return num <= 1000;
          case '1000-3000':
            return num >= 1000 && num <= 3000;
          case '3000+':
            return num >= 3000;
          default:
            return true;
        }
      });
    }

    if (datePosted) {
      const cutoff = new Date();
      if (datePosted === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (datePosted === 'week') cutoff.setDate(cutoff.getDate() - 7);
      else if (datePosted === 'month') cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter((j) => new Date(j.created_at) >= cutoff);
    }

    if (suitedForMe && skills.length > 0) {
      result = result.filter((j) => {
        const score = computeMatchScore(j.title, j.raw_text, skills);
        return score >= autoThreshold;
      });
    }

    setFilteredJobs(result);
  }, [jobs, search, jobType, salaryRange, datePosted, suitedForMe, skills, autoThreshold]);

  function getMatchScore(job: Job): number | null {
    if (!skills.length) return null;
    return computeMatchScore(job.title, job.raw_text, skills);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
        </p>
      </div>

      {/* Filter bar */}
      <div className="glass-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              className="premium-input pl-10"
              placeholder="Search jobs or companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Job type */}
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="premium-select"
          >
            <option value="">All types</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          {/* Salary range */}
          <select
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
            className="premium-select"
          >
            <option value="">Any salary</option>
            <option value="0-1000">$0 – $1,000</option>
            <option value="1000-3000">$1,000 – $3,000</option>
            <option value="3000+">$3,000+</option>
          </select>

          {/* Date posted */}
          <select
            value={datePosted}
            onChange={(e) => setDatePosted(e.target.value)}
            className="premium-select"
          >
            <option value="">Any time</option>
            <option value="today">Today</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
          </select>

          {/* Suited for me toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] mobile-touch">
            <input
              type="checkbox"
              checked={suitedForMe}
              onChange={(e) => setSuitedForMe(e.target.checked)}
              className="sr-only"
            />
            <span className={`flex h-4 w-4 items-center justify-center rounded border transition ${suitedForMe ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)] bg-transparent'}`}>
              {suitedForMe && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            Suited for me
          </label>
        </div>
      </div>

      {/* Job grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-secondary)]">
            No jobs match your filters.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setJobType('');
              setSalaryRange('');
              setDatePosted('');
              setSuitedForMe(false);
            }}
            className="mt-3 text-sm text-[var(--accent)] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredJobs.map((job) => {
            const score = getMatchScore(job);
            const scoreColor =
              score !== null
                ? score >= 80
                  ? 'text-[var(--match-high)]'
                  : score >= 50
                    ? 'text-[var(--match-mid)]'
                    : 'text-[var(--match-low)]'
                : 'text-[var(--text-muted)]';

            return (
              <Link
                key={job.id}
                href={`/feed/${job.id}`}
                className="glass-card hover-lift relative overflow-hidden p-5 transition hover:border-[var(--border-accent)] hover:bg-[var(--accent)]/5"
              >
                {/* Match score badge */}
                {score !== null && (
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2 py-0.5 font-mono text-xs font-bold ${scoreColor} bg-[var(--bg-surface)]`}
                  >
                    {score}%
                  </span>
                )}

                <h3 className="font-display pr-12 text-lg font-bold text-[var(--text-primary)]">
                  {job.title}
                </h3>
                <p className="mt-0.5 text-sm text-[var(--accent)]">
                  {job.companyName}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {job.location ?? 'Remote'}
                  {job.created_at && (
                    <>
                      <span className="mx-1">&middot;</span>
                      {new Date(job.created_at).toLocaleDateString()}
                    </>
                  )}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {job.salary && (
                    <span className="badge badge-high">
                      {job.salary}
                    </span>
                  )}
                  {job.source_group && (
                    <span className="text-xs text-[var(--text-muted)]">
                      via {job.source_group}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
