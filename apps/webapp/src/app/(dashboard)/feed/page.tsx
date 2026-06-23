'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Job, Profile } from '@aetherlink/core';
import { computeLegacyMatchScore, computeMatchScore } from '@/lib/scoring';
import { createClient } from '@/lib/supabase/client';

const JOB_TYPES = ['remote', 'hybrid', 'onsite'] as const;
const PAGE_SIZE = 50;

// ─── Helpers ───────────────────────────────────────────────

function cleanSummary(job: Job): string {
  if (job.summary) return job.summary;
  const raw = (job.description || '')
    // Remove markdown
    .replace(/[#*_~`>\[\]()#!|\\-]/g, ' ')
    // Remove common scraped navigation artifacts
    .replace(/\b(Swops|Search for CVs|Jobseeker Register CV|Employer Register|Post Jobs|Login|Candidate Sign Up|Employer Sign Up|Similar Jobs|Copy Job Link|Job Categories|Add Resume|Premium|Browse Jobs|Browse Candidates|About VacancyMail|Contact Us|Terms and Privacy|Cookies Policy|Disclaimer|Account|Log In|Register as a Job Seeker|Register as an Employer|Partner Sites|VacancyMail Blog|Savanna News|© Vacancy Mail)\b/gi, '')
    // Remove "Jobs" section headers
    .replace(/\n(Jobs|Categories|For Candidates|For Employers)\n/g, '\n')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
  // Remove trailing navigation noise
  const cleaned = raw.replace(/\s*(Search for CVs|Jobseeker Register|Employer Register|Post Jobs|Login).*/i, '');
  return cleaned.length > 200 ? cleaned.slice(0, 200) + '…' : cleaned || 'No description available.';
}

function getCompanyDisplayName(job: Job): string {
  const name = job.companyName?.trim();
  if (
    !name ||
    name.toLowerCase() === 'unknown employer' ||
    name.toLowerCase() === 'employer not disclosed'
  ) {
    return 'Company not disclosed';
  }
  return name;
}

function getAvatarGradient(name: string): string {
  const palettes = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-cyan-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-fuchsia-600',
    'from-sky-500 to-indigo-600',
    'from-teal-500 to-emerald-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
  }
  return palettes[Math.abs(hash) % palettes.length];
}

// ─── SVG Icon components ────────────────────────────────────

function MapPinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BriefcaseIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function GlobeIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function BookmarkIcon({ className = 'w-4 h-4', filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

// ─── Saved Jobs Hook (localStorage) ─────────────────────────

function useSavedJobs() {
  const [saved, setSaved] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('aetherlink_savedJobs') || '[]');
      setSaved(new Set(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSave = useCallback((jobId: number) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      try {
        localStorage.setItem('aetherlink_savedJobs', JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { savedJobs: saved, toggleSave };
}

// ─── Skeleton Components ────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-2 w-24 rounded-full" />
          <div className="skeleton h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

// ─── Premium Job Card ───────────────────────────────────────

function PremiumJobCard({
  job,
  score,
  showScore,
  saved,
  onToggleSave,
}: {
  job: Job;
  score: number | null;
  showScore: boolean;
  saved: boolean;
  onToggleSave: (id: number) => void;
}) {
  const summary = cleanSummary(job);
  const hasSummary = summary.length > 0;
  const hasClosingDate = !!job.closing_date;
  const isClosingSoon =
    hasClosingDate &&
    new Date(job.closing_date!).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const barColor =
    showScore && score !== null
      ? score >= 80
        ? 'high'
        : score >= 50
          ? 'mid'
          : score > 0
            ? 'low'
            : 'none'
      : 'none';

  const scoreColor =
    showScore && score !== null
      ? score >= 80
        ? 'text-[var(--match-high)]'
        : score >= 50
          ? 'text-[var(--match-mid)]'
          : score > 0
            ? 'text-[var(--match-low)]'
            : 'text-[var(--text-secondary)]'
      : 'text-[var(--text-secondary)]';

  const jobTypeLabel =
    job.jobType === 'remote'
      ? 'Remote'
      : job.jobType === 'hybrid'
        ? 'Hybrid'
        : job.jobType === 'onsite'
          ? 'On-site'
          : null;

  const postedDate = job.created_at
    ? new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border-accent)] hover:shadow-[0_0_20px_var(--accent-glow)] focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-base)]"
    >
      {/* Card body — clickable */}
      <Link
        href={`/feed/${job.id}`}
        className="flex flex-col p-5 pb-3 focus:outline-none"
        tabIndex={0}
      >
        {/* Avatar + title + company */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getAvatarGradient(job.companyName || '?')} text-sm font-bold text-white shadow-sm`}
          >
            {job.companyName?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-hover)] line-clamp-2 leading-snug">
              {job.title}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {getCompanyDisplayName(job)}
            </p>
          </div>
        </div>

        {/* AI-cleaned Summary */}
        {hasSummary && (
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2">
            {summary}
          </p>
        )}

        {/* Chips / Badges row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {jobTypeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--glass-bg-subtle)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-secondary)]">
              <BriefcaseIcon className="w-3 h-3" />
              {jobTypeLabel}
            </span>
          )}
          {job.location && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--glass-bg-subtle)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-secondary)]">
              <MapPinIcon className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{job.location}</span>
            </span>
          )}
          {job.salary && (
            <span className="badge badge-high">{job.salary}</span>
          )}
          {isClosingSoon && (
            <span className="badge badge-high">Closing soon</span>
          )}
          {job.source_group && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--glass-bg-subtle)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-muted)]">
              <GlobeIcon className="w-3 h-3" />
              {job.source_group}
            </span>
          )}
          {postedDate && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--glass-bg-subtle)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-faint)]">
              <CalendarIcon className="w-3 h-3" />
              {postedDate}
            </span>
          )}
        </div>

        {/* Match score bar */}
        {showScore && (
          <div className="mt-3 flex items-center gap-2">
            <div className="score-bar score-bar-sm flex-1 max-w-[120px] overflow-hidden rounded-full">
              <div
                className={`score-bar-fill ${barColor}`}
                style={{ '--score-width': `${Math.max(score ?? 0, 0)}%` } as React.CSSProperties}
              />
            </div>
            <span className={`font-mono text-[0.6875rem] font-bold ${scoreColor}`}>
              {score !== null && score > 0
                ? `${score}% match`
                : 'Not scored'}
            </span>
          </div>
        )}
        {!showScore && (
          <p className="mt-2 text-[0.625rem] text-[var(--text-faint)] italic">
            Add 3+ skills in your profile to see match scores
          </p>
        )}
      </Link>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-[var(--border)] px-5 py-3">
        <Link
          href={`/feed/${job.id}`}
          className="premium-btn premium-btn-primary text-xs flex-1 pointer-active"
        >
          View Details
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(job.id);
          }}
          className={`premium-btn flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 ${
            saved
              ? 'bg-[var(--accent)]/15 text-[var(--accent-hover)] border border-[var(--border-accent)]'
              : 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
          } pointer-active`}
          aria-label={saved ? 'Unsave job' : 'Save job'}
        >
          <BookmarkIcon className="w-3.5 h-3.5" filled={saved} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyFeedState({ onClear }: { onClear: () => void }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--glass-bg-hover)] border border-[var(--border)]">
        <svg
          className="h-10 w-10 text-[var(--text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
        No jobs found
      </h2>
      <p className="mt-1.5 max-w-xs text-sm text-[var(--text-secondary)]">
        We couldn&apos;t find any jobs matching your current filters. Try adjusting your search or clearing the filters.
      </p>
      <button
        onClick={onClear}
        className="mt-5 premium-btn premium-btn-secondary text-sm pointer-active"
      >
        Clear all filters
      </button>
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────

function FeedSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="section-heading mb-0">{title}</h2>
        {subtitle && (
          <p className="section-subheading mb-0 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

export default function FeedPage() {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<string>('');
  const [salaryRange, setSalaryRange] = useState<string>('');
  const [datePosted, setDatePosted] = useState<string>('');
  const [suitedForMe, setSuitedForMe] = useState(false); // eslint-disable-line

  // Saved jobs
  const { savedJobs, toggleSave } = useSavedJobs();

  // Load first page
  useEffect(() => {
    void (async () => {
      const isDebug = window.location.search.includes('debug=true');
      try {
        let feed, prof;
        if (isDebug) {
          [feed, prof] = await Promise.all([
            sdk.listFeedJobs({ limit: PAGE_SIZE }),
            sdk.getAetherLinkProfile(),
          ]);
        } else {
          const { data } = await supabase.auth.getUser();
          if (!data?.user) {
            setLoading(false);
            return;
          }
          [feed, prof] = await Promise.all([
            sdk.listFeedJobs({ limit: PAGE_SIZE }),
            sdk.getAetherLinkProfile(),
          ]);
        }
        setJobs(feed.jobs);
        setFilteredJobs(feed.jobs);
        setTotalLoaded(feed.jobs.length);
        setNextPageToken(feed.nextPageToken);
        setHasMore(!!feed.nextPageToken);
        setProfile(prof ?? null);
      } catch (e) {
        console.error('Feed load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk, supabase]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextPageToken) return;
    setLoadingMore(true);
    try {
      const feed = await sdk.listFeedJobs({
        limit: PAGE_SIZE,
        after: nextPageToken,
      });
      setJobs((prev) => [...prev, ...feed.jobs]);
      setTotalLoaded((prev) => prev + feed.jobs.length);
      setNextPageToken(feed.nextPageToken);
      setHasMore(!!feed.nextPageToken);
    } catch (e) {
      console.error('Load more error:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [sdk, loadingMore, hasMore, nextPageToken]);

  // Infinite scroll: IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const skills = profile?.skills ?? [];

  // Apply client-side filters
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
        const hasStructuredContent =
          j.requirements?.length || j.responsibilities?.length;

        if (hasStructuredContent && j.parser_version === 2) {
          const structuredScore = computeMatchScore(
            j.requirements ?? [],
            skills,
            profile?.certifications ?? [],
            [],
          );
          return (structuredScore ?? 0) >= 80;
        } else {
          const legacyScore = computeLegacyMatchScore(
            j.title,
            j.description,
            skills,
          );
          return legacyScore >= 80;
        }
      });
    }

    setFilteredJobs(result);
  }, [
    jobs,
    search,
    jobType,
    salaryRange,
    datePosted,
    suitedForMe,
    skills,
    profile?.certifications,
  ]);

  function getMatchScore(job: Job): number | null {
    if (!skills.length) return null;
    const hasStructuredContent =
      job.requirements?.length || job.responsibilities?.length;
    if (hasStructuredContent && job.parser_version === 2) {
      const structuredScore = computeMatchScore(
        job.requirements ?? [],
        skills,
        profile?.certifications ?? [],
        [],
      );
      return structuredScore;
    } else {
      return computeLegacyMatchScore(job.title, job.description, skills);
    }
  }

  const activeFilterCount = [jobType, salaryRange, datePosted, suitedForMe].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setSearch('');
    setJobType('');
    setSalaryRange('');
    setDatePosted('');
    setSuitedForMe(false);
  }, []);

  // ── Section grouping logic ──
  const skillsCount = skills.length;
  const canShowScore = skillsCount >= 3;

  const recommendedJobs = canShowScore
    ? filteredJobs
        .filter((j) => {
          const s = getMatchScore(j);
          return s !== null && s > 50;
        })
        .sort((a, b) => (getMatchScore(b) ?? 0) - (getMatchScore(a) ?? 0))
    : [];

  const latestJobs = canShowScore
    ? filteredJobs
        .filter((j) => {
          const s = getMatchScore(j);
          return s === null || s <= 50;
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
    : [...filteredJobs].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

  const hasSections = canShowScore && recommendedJobs.length > 0;

  // ── Render ──
  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Job Feed
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
          {!loading && hasMore && ` (${totalLoaded} loaded so far)`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="glass-card p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              className="premium-input pl-11"
              placeholder="Search jobs or companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search jobs or companies"
            />
          </div>

          {/* Filters row — horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="premium-select min-w-0 shrink-0"
              aria-label="Filter by job type"
            >
              <option value="">All types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              className="premium-select min-w-0 shrink-0"
              aria-label="Filter by salary range"
            >
              <option value="">Any salary</option>
              <option value="0-1000">$0 – $1,000</option>
              <option value="1000-3000">$1,000 – $3,000</option>
              <option value="3000+">$3,000+</option>
            </select>

            <select
              value={datePosted}
              onChange={(e) => setDatePosted(e.target.value)}
              className="premium-select min-w-0 shrink-0"
              aria-label="Filter by date posted"
            >
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="shrink-0 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-2 py-1"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Suited for me toggle */}
          <label className="premium-checkbox mobile-touch pt-1">
            <input
              type="checkbox"
              checked={suitedForMe}
              onChange={(e) => setSuitedForMe(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`premium-checkbox-box ${suitedForMe ? 'checked' : ''}`}
            >
              {suitedForMe && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>
            <span className="premium-checkbox-text select-none">
              Suited for me
            </span>
          </label>
        </div>
      </div>

      {/* Loading state — 6 skeleton cards */}
      {loading && <FeedSkeleton />}

      {/* Empty state */}
      {!loading && filteredJobs.length === 0 && (
        <EmptyFeedState onClear={clearFilters} />
      )}

      {/* Job sections */}
      {!loading && filteredJobs.length > 0 && (
        <div className="space-y-8 stagger-children">
          {hasSections ? (
            <>
              {/* Recommended for you */}
              <FeedSection
                title="Recommended for you"
                subtitle={`${recommendedJobs.length} high-match ${recommendedJobs.length === 1 ? 'opportunity' : 'opportunities'}`}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recommendedJobs.map((job) => (
                    <PremiumJobCard
                      key={job.id}
                      job={job}
                      score={getMatchScore(job)}
                      showScore={canShowScore}
                      saved={savedJobs.has(job.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              </FeedSection>

              {/* Latest jobs */}
              <FeedSection
                title="Latest jobs"
                subtitle={`${latestJobs.length} recent ${latestJobs.length === 1 ? 'posting' : 'postings'}`}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {latestJobs.map((job) => (
                    <PremiumJobCard
                      key={job.id}
                      job={job}
                      score={getMatchScore(job)}
                      showScore={canShowScore}
                      saved={savedJobs.has(job.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              </FeedSection>
            </>
          ) : (
            <FeedSection
              title="All jobs"
              subtitle={`${filteredJobs.length} ${filteredJobs.length === 1 ? 'posting' : 'postings'}`}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredJobs.map((job) => (
                  <PremiumJobCard
                    key={job.id}
                    job={job}
                    score={getMatchScore(job)}
                    showScore={canShowScore}
                    saved={savedJobs.has(job.id)}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
            </FeedSection>
          )}
        </div>
      )}

      {/* Infinite scroll sentinel + load more button */}
      {!loading && hasMore && (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center gap-3 py-6"
        >
          {loadingMore && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading more jobs…
            </div>
          )}
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="premium-btn premium-btn-secondary text-sm pointer-active disabled:opacity-50"
          >
            Load more jobs ({totalLoaded} loaded)
          </button>
        </div>
      )}

      {/* All loaded indicator */}
      {!loading && !hasMore && totalLoaded > PAGE_SIZE && (
        <p className="text-center text-xs text-[var(--text-muted)] py-4">
          All {totalLoaded} jobs loaded — you&apos;re all caught up 🎉
        </p>
      )}
    </div>
  );
}
