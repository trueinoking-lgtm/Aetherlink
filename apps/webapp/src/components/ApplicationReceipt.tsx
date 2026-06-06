'use client';

import { useEffect, useState } from 'react';

export function ApplicationReceipt({
  open,
  onClose,
  jobTitle,
  companyName,
  hrEmail,
  matchScore,
  coverLetter,
  sentAt,
  startedAt,
}: {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
  hrEmail: string;
  matchScore: number;
  coverLetter: string;
  sentAt: string;
  startedAt: number;
}) {
  const [showLetter, setShowLetter] = useState(false);
  const [checkVisible, setCheckVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setCheckVisible(true));
    }
  }, [open]);

  if (!open) return null;

  const minutesSpent = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  const timeSaved = Math.max(20, 45 - minutesSpent);
  const firstParagraph = coverLetter.split('\n\n')[0] ?? coverLetter.slice(0, 280);

  const shareText = `Just applied to ${jobTitle} at ${companyName} via AetherLink in under 3 minutes 🔥`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--accent)] text-4xl text-[var(--accent)] transition-transform duration-500 ${checkVisible ? 'scale-100' : 'scale-0'}`}
        >
          ✓
        </div>
        <h1 className="font-display text-2xl font-bold">Application Sent</h1>
        <p className="text-[var(--text-secondary)]">
          {jobTitle} — {companyName}
        </p>
        <p className="text-sm text-[var(--text-muted)]">To: {hrEmail}</p>
        <p className="font-mono text-sm">Match used: {matchScore}%</p>
        <p className="text-[var(--accent)]">Time saved: ~{timeSaved} minutes</p>
        <div className="text-left">
          <button
            type="button"
            className="text-sm text-[var(--accent)]"
            onClick={() => setShowLetter((s) => !s)}
          >
            {showLetter ? 'Hide' : 'Show'} cover letter preview
          </button>
          {showLetter && (
            <p className="mt-2 rounded border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">
              {firstParagraph}
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">{new Date(sentAt).toLocaleString()}</p>
        <button
          type="button"
          className="w-full rounded-lg border border-[var(--accent)] py-2 text-[var(--accent)]"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({ text: shareText });
            } else {
              void navigator.clipboard.writeText(shareText);
            }
          }}
        >
          Share on WhatsApp
        </button>
        <button type="button" onClick={onClose} className="text-sm text-[var(--text-secondary)]">
          Back to feed
        </button>
      </div>
    </div>
  );
}
