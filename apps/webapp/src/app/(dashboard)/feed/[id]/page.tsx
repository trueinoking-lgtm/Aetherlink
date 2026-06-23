'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Job, Profile } from '@aetherlink/core';
import { computeMatchScore } from '@/lib/scoring';
import JobSection from '@/components/JobSection';

function ScoreCircle({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setOffset(circumference - (score / 100) * circumference);
    });
    return () => cancelAnimationFrame(t);
  }, [score, circumference]);

  const barColor =
    score >= 70
      ? 'high'
      : score >= 40
        ? 'mid'
        : 'low';
  const barTrackColor =
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
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90" aria-hidden="true">
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
            style={{ '--score-color': barTrackColor } as React.CSSProperties}
          />
        </svg>
        <span className="absolute font-display text-2xl font-bold text-[var(--text-primary)] animate-fade-in">
          {score}%
        </span>
      </div>
      <span className={`text-xs font-medium ${barColor === 'high' ? 'text-[var(--match-high)]' : barColor === 'mid' ? 'text-[var(--match-mid)]' : 'text-[var(--match-low)]'}`}>
        {label}
      </span>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card px-4 py-3">
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-display text-base font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return '';
  }
}

// ─── CTA Analytics ───────────────────────────────────────────
function trackCtaClick(ctaType: string, jobId: number) {
  // Log to console for now — replace with Supabase analytics insert later
  console.log('[CTA]', { ctaType, jobId, clicked_at: new Date().toISOString() });
}

// ─── Mark as Applied Button ──────────────────────────────────
function MarkAsAppliedButton({ jobId, jobTitle }: { jobId: number; jobTitle: string }) {
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check if already applied
    try {
      const stored = JSON.parse(localStorage.getItem('aetherlink_appliedJobs') || '[]');
      if (stored.includes(jobId)) setApplied(true);
    } catch { /* ignore */ }
  }, [jobId]);

  const toggle = () => {
    setSaving(true);
    try {
      const stored = JSON.parse(localStorage.getItem('aetherlink_appliedJobs') || '[]');
      if (applied) {
        const next = stored.filter((id: number) => id !== jobId);
        localStorage.setItem('aetherlink_appliedJobs', JSON.stringify(next));
        setApplied(false);
      } else {
        stored.push(jobId);
        localStorage.setItem('aetherlink_appliedJobs', JSON.stringify(stored));
        setApplied(true);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (applied) {
    return (
      <button
        onClick={toggle}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-md border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2.5 text-sm font-medium text-[var(--success)] transition-all hover:bg-[var(--success)]/20 pointer-active"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Marked as applied
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="w-full flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--glass-bg-hover)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] pointer-active"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Mark as applied
    </button>
  );
}

function getApplicationAction(job: Job) {
  const cleanUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (trimmed === '#' || !/^https?:\/\//i.test(trimmed)) return undefined;
    return trimmed;
  };

  // 1. Source URL — PRIMARY for website-scraped jobs
  const cleanSourceUrl = cleanUrl(job.source_group);
  if (cleanSourceUrl) {
    return { label: "View original listing", href: cleanSourceUrl, kind: "link" as const, icon: "external" };
  }

  // 2. Application URL (direct app link, no source_url)
  const cleanAppUrl = cleanUrl(job.application_url);
  if (cleanAppUrl) {
    return { label: "Open application link", href: cleanAppUrl, kind: "link" as const, icon: "external" };
  }

  // 3. Email
  if (job.application_email) {
    return { label: "Email employer", href: `mailto:${job.application_email}`, kind: "link" as const, icon: "email" };
  }

  // 4. WhatsApp
  const howToApply = (job.how_to_apply || '').toLowerCase();
  if (job.application_phone && (howToApply.includes('whatsapp') || howToApply.includes('wa.me'))) {
    let normalizedPhone = job.application_phone.replace(/[^\d]/g, '');
    if (normalizedPhone.startsWith('0') && normalizedPhone.length >= 9) {
      normalizedPhone = '263' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('263') && !normalizedPhone.startsWith('+263')) {
      normalizedPhone = '263' + normalizedPhone;
    }
    return { label: "Contact via WhatsApp", href: `https://wa.me/${normalizedPhone}`, kind: "link" as const, icon: "whatsapp" };
  }

  // 5. Phone (non-WhatsApp)
  if (job.application_phone) {
    const normalizedPhone = job.application_phone.replace(/[^\d+]/g, '');
    return { label: "Contact employer", href: `tel:${normalizedPhone}`, kind: "link" as const, icon: "phone" };
  }

  // 6. Hand delivery or other instructions
  if (job.how_to_apply?.trim()) {
    const isHandDelivery = howToApply.includes('deliver') || howToApply.includes('drop off') || howToApply.includes('hand deliver');
    return {
      label: isHandDelivery ? "View delivery instructions" : "View application instructions",
      href: null,
      kind: "instructions" as const,
      icon: isHandDelivery ? "delivery" : "instructions",
    };
  }

  // 7. Fallback to external listing
  const cleanExternalUrl = cleanUrl(job.externalUrl);
  if (cleanExternalUrl) {
    return { label: "View original listing", href: cleanExternalUrl, kind: "link" as const, icon: "external" };
  }

  // 8. Nothing available — no button
  return { label: "No application method", href: null, kind: "none" as const, icon: "unavailable" };
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = Number(id);
  const sdk = useSdk() as AetherLinkSupabaseApi;

  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [j, prof] = await Promise.all([
          sdk.getFeedJob(jobId),
          sdk.getAetherLinkProfile(),
        ]);
        setJob(j);
        setProfile(prof ?? null);

        // Calculate match score if we have data
        if (j && prof && (j.requirements?.length || j.responsibilities?.length)) {
          const skills = prof.skills ?? [];
          const requirements = j.requirements ?? [];
          
          if (requirements.length > 0) {
            const score = computeMatchScore(
              requirements,
              skills,
              prof.certifications ?? [],
              [],
            );
            setMatchScore(score ?? null);
          }
        }
      } catch (e) {
        console.error('Job detail load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, sdk]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 bg-[var(--border)] rounded" />
          <div className="h-4 w-1/2 bg-[var(--border)] rounded" />
          <div className="space-y-4 mt-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-[var(--border)] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Job not found</h1>
          <p className="mt-2 text-[var(--text-secondary)]">This job may have been removed or doesn&apos;t exist.</p>
          <Link href="/feed" className="mt-6 premium-btn-secondary inline-block">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const employerName = getEmployerName(job.companyName);
  const closingDateDisplay = formatDate(job.closing_date);
  const postedDateDisplay = formatDate(typeof job.created_at === 'string' ? job.created_at : job.created_at?.toISOString());
  
  const applicationAction = getApplicationAction(job);
  const hasScorableContent = Boolean(job.requirements?.length) || Boolean(job.responsibilities?.length);

  // Check if job has minimum useful content
  const hasStructuredContent = 
    (job.responsibilities && job.responsibilities.length > 0) ||
    (job.requirements && job.requirements.length > 0) ||
    (job.application_email && job.application_email.trim()) ||
    (job.application_url && job.application_url.trim()) ||
    (job.how_to_apply && job.how_to_apply.trim());

  const hasCompany = job.companyName && 
    job.companyName !== 'Unknown Employer' && 
    job.companyName !== 'Employer not disclosed';

  const isIncomplete = !hasStructuredContent && !hasCompany;

  // Determine if we should show score
  const showScore = matchScore != null && hasScorableContent;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {isIncomplete && (
        <div className="glass-card mb-6 border-[var(--warning)]/30 bg-[var(--warning-bg)] p-4">
          <p className="text-sm text-[var(--warning)]">
            ⚠️ This listing is being refreshed. Some details may be incomplete. Please check back later or view the original listing.
          </p>
          {job.source_group && (
            <a 
              href={job.source_group} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-[var(--accent)] underline"
            >
              View original listing →
            </a>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                  {job.title || "Untitled position"}
                </h1>
                <p className="mt-2 text-lg text-[var(--text-secondary)]">
                  {employerName}
                  {job.employer_verified && (
                    <span className="ml-1.5 text-[var(--success)]" title="Verified employer" aria-label="Verified employer">
                      ✓
                    </span>
                  )}
                </p>
              </div>
              
              {showScore && (
                <div className="shrink-0">
                  <ScoreCircle score={matchScore} />
                </div>
              )}
            </div>

            {/* Key metadata */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {job.location && (
                <MetaItem label="Location" value={job.location} />
              )}
              {job.employment_type && (
                <MetaItem label="Employment Type" value={job.employment_type} />
              )}
              {job.category && (
                <MetaItem label="Category" value={job.category} />
              )}
              {closingDateDisplay && (
                <MetaItem label="Closes" value={closingDateDisplay} />
              )}
            </div>
          </div>

          {/* Summary section */}
          {job.summary && (
            <JobSection title="About the role">
              <p className="whitespace-pre-line text-[var(--text-primary)]">
                {job.summary}
              </p>
            </JobSection>
          )}

          {/* Responsibilities */}
          {!!job.responsibilities?.length && (
            <JobSection title="Responsibilities">
              <ul className="list-disc space-y-2 pl-5">
                {job.responsibilities.map((item, index) => (
                  <li key={`${item}-${index}`} className="text-[var(--text-primary)]">
                    {item}
                  </li>
                ))}
              </ul>
            </JobSection>
          )}

          {/* Requirements */}
          {!!job.requirements?.length && (
            <JobSection title="Requirements">
              <ul className="list-disc space-y-2 pl-5">
                {job.requirements.map((item, index) => (
                  <li key={`${item}-${index}`} className="text-[var(--text-primary)]">
                    {item}
                  </li>
                ))}
              </ul>
            </JobSection>
          )}

          {/* How to Apply */}
          {job.how_to_apply && (
            <JobSection title="How to apply">
              <p className="whitespace-pre-line text-[var(--text-primary)]">
                {job.how_to_apply}
              </p>
            </JobSection>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Primary CTA */}
          <div className="glass-card p-6">
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)] mb-4">
              Original application
            </h3>
            
            {applicationAction.kind === 'none' ? (
              <p className="text-sm text-[var(--text-muted)]">
                Application details are currently unavailable. This listing may be refreshed later.
              </p>
            ) : applicationAction.kind === 'instructions' ? (
              <button
                onClick={() => {
                  const el = document.querySelector('[data-section="how-to-apply"]');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full premium-btn-primary py-3"
              >
                {applicationAction.label}
              </button>
            ) : (
              <a
                href={applicationAction.href || '#'}
                target={applicationAction.href?.startsWith('http') ? '_blank' : undefined}
                rel={applicationAction.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="w-full premium-btn-primary py-3 inline-block text-center"
                onClick={() => trackCtaClick(applicationAction.icon, jobId)}
              >
                {applicationAction.label}
              </a>
            )}

            {/* Mark as applied */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <MarkAsAppliedButton jobId={jobId} jobTitle={job.title || ''} />
            </div>
          </div>

          {/* Additional details */}
          <div className="glass-card p-6">
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)] mb-4">
              Additional details
            </h3>
            
            <div className="space-y-3">
              {job.application_email && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">Email</p>
                  <a 
                    href={`mailto:${job.application_email}`}
                    className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
                  >
                    {job.application_email}
                  </a>
                </div>
              )}
              
              {job.application_phone && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">Phone</p>
                  <a 
                    href={`tel:${job.application_phone.replace(/[^\d+]/g, '')}`}
                    className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
                  >
                    {job.application_phone}
                  </a>
                </div>
              )}
              
              {job.externalUrl && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">Source</p>
                  <a 
                    href={job.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
                  >
                    View original listing
                  </a>
                </div>
              )}
              
              {postedDateDisplay && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">Posted</p>
                  <p className="text-sm text-[var(--text-primary)]">{postedDateDisplay}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}