'use client';

import { useState } from 'react';

export type RewriteItem = {
  original: string;
  rewritten: string;
  change_reason: string;
  accepted: boolean;
};

export function CVRewritePanel({
  open,
  onClose,
  rewrites,
  onToggle,
  onApply,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  rewrites: RewriteItem[];
  onToggle: (index: number) => void;
  onApply: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--bg-overlay)]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] p-4 md:max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Optimize my CV</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] pointer-active"
            aria-label="Close panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {rewrites.map((r, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-sm text-[var(--text-muted)] line-through-decoration">{r.original}</p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">{r.rewritten}</p>
              <p className="mt-1 text-xs text-[var(--accent-active)]">{r.change_reason}</p>
              <label className="mt-2 flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={r.accepted}
                  onChange={() => onToggle(i)}
                  className="premium-checkbox-input"
                />
                Accept rewrite
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onApply}
          className="mt-4 premium-btn premium-btn-primary w-full disabled:opacity-50 pointer-active"
        >
          {loading ? 'Applying…' : 'Apply with these changes'}
        </button>
      </div>
    </div>
  );
}
