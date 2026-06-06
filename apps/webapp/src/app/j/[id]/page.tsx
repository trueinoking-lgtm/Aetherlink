'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  scoreMatch,
  getRelativeTimeString,
  type FeedJob,
  type CvDraft,
} from '@aetherlink/core';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import { ScoreBar } from '@/components/ScoreBar';
import { CVRewritePanel, type RewriteItem } from '@/components/CVRewritePanel';
import { ApplicationReceipt } from '@/components/ApplicationReceipt';
import { GmailConnectPrompt } from '@/components/GmailConnectPrompt';
import { loadCvDraft } from '@/lib/cvStorage';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = Number(id);
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const router = useRouter();
  const [job, setJob] = useState<FeedJob | null>(null);
  const [cv, setCv] = useState<CvDraft | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [rewrites, setRewrites] = useState<RewriteItem[]>([]);
  const [rewriting, setRewriting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [receipt, setReceipt] = useState<{
    coverLetter: string;
    sentAt: string;
    hrEmail: string;
    matchScore: number;
  } | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    void (async () => {
      const [j, draft, profile] = await Promise.all([
        sdk.getFeedJob(jobId),
        loadCvDraft(),
        sdk.getAetherLinkProfile(),
      ]);
      setJob(j);
      setCv(draft);
      setGmailConnected(!!profile?.gmail_email);
    })();
  }, [sdk, jobId]);

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">
        Loading…
      </div>
    );
  }

  const feedJob = job;
  const requirements = feedJob.requirements ?? [];
  const score = cv
    ? scoreMatch(
        requirements,
        cv.skills,
        cv.certifications,
        cv.experience.flatMap((e) => e.bullets),
      )
    : { score: 50, matched: [], missing: requirements, percentileLabel: '—', percentileColor: 'amber' as const };

  async function runRewrite() {
    if (!cv) return;
    setRewriting(true);
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullets: cv.experience.flatMap((e) => e.bullets).filter(Boolean),
          jobTitle: feedJob.title,
          missingRequirements: score.missing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRewrites(
        data.rewrites.map((r: RewriteItem) => ({ ...r, accepted: true })),
      );
      setRewriteOpen(true);
    } finally {
      setRewriting(false);
    }
  }

  async function runApply() {
    if (!cv || !feedJob.hr_email) return;
    setApplying(true);
    try {
      const { buildCvPdfBase64 } = await import('@/lib/cvPdf');
      const cvPdfBase64 = await buildCvPdfBase64(
        cv,
        score.missing.length ? rewrites.filter((r) => r.accepted) : [],
      );

      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: feedJob,
          userProfile: { headline: cv.headline, skills: cv.skills, full_name: cv.fullName },
          cvPdfBase64,
          acceptedRewrites: rewrites.filter((r) => r.accepted),
          matchScore: score.score,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReceipt({
        coverLetter: data.coverLetter,
        sentAt: data.sentAt,
        hrEmail: data.hrEmail,
        matchScore: data.matchScore ?? score.score,
      });
      setRewriteOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-24 text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <Link href="/feed" className="text-sm text-[var(--accent)]">
          ← Feed
        </Link>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{feedJob.title}</h1>
          <p className="text-[var(--text-secondary)]">{feedJob.companyName}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {getRelativeTimeString(new Date(feedJob.created_at))}
          </p>
        </div>

        <ScoreBar result={score} />

        {score.matched.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--success)]">Matched</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-[var(--text-secondary)]">
              {score.matched.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {score.missing.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--danger)]">Gaps</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-[var(--text-secondary)]">
              {score.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={runRewrite}
              disabled={rewriting || !cv}
              className="mt-3 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]"
            >
              {rewriting ? 'Optimizing…' : 'Optimize my CV for this role'}
            </button>
          </div>
        )}

        {requirements.length > 0 && (
          <div>
            <h3 className="font-medium">Requirements</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-[var(--text-secondary)]">
              {requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {feedJob.raw_text && (
          <div>
            <button
              type="button"
              className="text-sm text-[var(--accent)]"
              onClick={() => setShowRaw((s) => !s)}
            >
              {showRaw ? 'Hide' : 'Show'} original post
            </button>
            {showRaw && (
              <pre className="mt-2 whitespace-pre-wrap rounded border border-[var(--border)] p-3 text-xs text-[var(--text-secondary)]">
                {feedJob.raw_text}
              </pre>
            )}
          </div>
        )}

        {gmailConnected === false && (
          <GmailConnectPrompt onConnect={() => (window.location.href = '/api/auth/gmail/connect')} />
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <button
          type="button"
          disabled={applying || !feedJob.hr_email || gmailConnected === false}
          onClick={() => (rewrites.length ? runApply() : runApply())}
          className="mx-auto block w-full max-w-2xl rounded-lg bg-[var(--accent)] py-3 font-display font-bold text-black disabled:opacity-40"
        >
          {applying ? 'Sending…' : 'Apply Now'}
        </button>
      </div>

      <CVRewritePanel
        open={rewriteOpen}
        onClose={() => setRewriteOpen(false)}
        rewrites={rewrites}
        onToggle={(i) =>
          setRewrites((rs) => rs.map((r, idx) => (idx === i ? { ...r, accepted: !r.accepted } : r)))
        }
        onApply={runApply}
        loading={applying}
      />

      {receipt && (
        <ApplicationReceipt
          open
          onClose={() => router.push('/tracker')}
          jobTitle={feedJob.title}
          companyName={feedJob.companyName}
          hrEmail={receipt.hrEmail}
          matchScore={receipt.matchScore}
          coverLetter={receipt.coverLetter}
          sentAt={receipt.sentAt}
          startedAt={startedAt}
        />
      )}
    </div>
  );
}
