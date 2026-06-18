import Link from 'next/link';

export default function TermsPage() {
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)]">Terms of Service</h1>
          <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
            <p>
              By using AetherLink, you agree to these terms. AetherLink is a job search assistant
              that helps you find and apply to jobs using AI-powered matching.
            </p>
            <p>
              You are responsible for the accuracy of the information in your profile and CV.
              AetherLink will send applications on your behalf using your connected email account.
            </p>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service
              constitutes acceptance of the updated terms.
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
