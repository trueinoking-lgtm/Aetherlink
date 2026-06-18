'use client';

export function GmailConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--warning)] bg-[var(--bg-raised)] p-4">
      <p className="text-sm text-[var(--text-primary)]">
        Connect your Gmail to send applications from your personal address — HR contacts see a real
        email, not a bulk sender.
      </p>
      <button
        type="button"
        onClick={onConnect}
        className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-[var(--text-primary)]"
      >
        Connect Gmail
      </button>
    </div>
  );
}
