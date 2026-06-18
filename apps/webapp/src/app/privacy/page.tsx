import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="page-wrapper py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition hover:text-[var(--accent-hover)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to AetherLink
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)]">Privacy Policy</h1>
          <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
            <p>
              AetherLink collects your name, email, skills and experience to match you with jobs. We
              store anonymized signals about how jobs perform on our platform to improve our service.
              We never sell your personal information. Your CV data lives on your device until you
              choose to generate a PDF to apply.
            </p>
            <p>
              We use Supabase for authentication and data storage. Your Google account is only used
              for secure sign-in and sending job applications from your personal email address.
            </p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Questions? Contact us at trueinoking@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
