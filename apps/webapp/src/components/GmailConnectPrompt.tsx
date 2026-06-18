'use client';

export function GmailConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] p-4">
      <p className="text-sm text-[var(--text-primary)]">
        Connect your Gmail to send applications from your personal address — HR contacts see a real
        email, not a bulk sender.
      </p>
      <button
        type="button"
        onClick={onConnect}
        className="mt-3 premium-btn premium-btn-primary w-full pointer-active"
      >
        Connect Gmail
      </button>
    </div>
  );
}
