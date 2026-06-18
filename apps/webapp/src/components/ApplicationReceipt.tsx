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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--bg-overlay)] p-4">
      <div className="w-full max-w-md space-y-6 text-center glass-card p-8 max-h-[90vh] overflow-y-auto">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--accent)] text-4xl text-[var(--accent)] transition-transform duration-500 ${checkVisible ? 'scale-100' : 'scale-0'}`}
        >
          ✓
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Application Sent</h1>
        <p className="text-[var(--text-secondary)]">
          {jobTitle} — {companyName}
        </p>
        <p className="text-sm text-[var(--text-muted)]">To: {hrEmail}</p>
        <p className="font-mono text-sm text-[var(--text-secondary)]">Match used: {matchScore}%</p>
        <p className="text-[var(--accent)] font-medium">Time saved: ~{timeSaved} minutes</p>
        <div className="text-left">
          <button
            type="button"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition pointer-active"
            onClick={() => setShowLetter((s) => !s)}
          >
            {showLetter ? 'Hide' : 'Show'} cover letter preview
          </button>
          {showLetter && (
            <p className="mt-2 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)]">
              {firstParagraph}
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">{new Date(sentAt).toLocaleString()}</p>
        <button
          type="button"
          className="premium-btn premium-btn-primary w-full pointer-active"
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
        <button type="button" onClick={onClose} className="premium-btn premium-btn-ghost mx-auto pointer-active">
          Back to feed
        </button>
      </div>
    </div>
  );
}
