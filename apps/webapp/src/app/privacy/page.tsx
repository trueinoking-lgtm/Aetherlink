import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/" className="text-sm text-[var(--accent)]">
          ← Back
        </Link>
        <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          AetherLink collects your name, email, skills and experience to match you with jobs. We
          store anonymized signals about how jobs perform on our platform to improve our service.
          We never sell your personal information. Your CV data lives on your device until you
          choose to generate a PDF to apply.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Questions? Contact us at trueinoking@gmail.com
        </p>
      </div>
    </div>
  );
}
