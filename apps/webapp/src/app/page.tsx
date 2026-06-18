'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-orb absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="bg-orb-delayed absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="bg-orb-slow absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--accent)]/3 blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg-base)_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Aether<span className="gradient-text">Link</span>
          </h1>
          <p className="mt-4 text-xl font-medium text-[var(--text-primary)]">
            Find jobs. Apply instantly.
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your AI-powered job search assistant.
          </p>
          {/* Social proof */}
          <div className="mt-7 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2" aria-hidden="true">
                <div className="login-avatar bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dim)] text-[var(--text-primary)] ring-2 ring-[var(--bg-base)]">A</div>
                <div className="login-avatar bg-gradient-to-br from-[var(--success)] to-[var(--avatar-success-end)] text-[var(--text-primary)] ring-2 ring-[var(--bg-base)]">M</div>
                <div className="login-avatar bg-gradient-to-br from-[var(--warning)] to-[var(--avatar-warning-end)] text-[var(--text-primary)] ring-2 ring-[var(--bg-base)]">T</div>
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">500+ job seekers</span>
            </div>
            <div className="login-divider" aria-hidden="true" />
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5" aria-hidden="true">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="h-4 w-4 text-[var(--warning)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">4.9 rating</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="login-card glass-card p-8 login-card-glow animate-fade-in">
          {/* Feature highlights */}
          <div className="mb-10 space-y-6">
            <div className="flex items-start gap-4 group hover-lift p-2 -m-2 rounded-lg transition-all duration-200">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition-all duration-200 group-hover:bg-[var(--accent)]/20 group-hover:scale-105">
                <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="pt-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Auto-apply to jobs</span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)] leading-relaxed">Apply to hundreds of jobs with one click</span>
              </div>
            </div>
            <div className="flex items-start gap-4 group hover-lift p-2 -m-2 rounded-lg transition-all duration-200">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--success)]/10 transition-all duration-200 group-hover:bg-[var(--success)]/20 group-hover:scale-105">
                <svg className="h-5 w-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="pt-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Smart matching</span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)] leading-relaxed">AI matches you with the best opportunities</span>
              </div>
            </div>
            <div className="flex items-start gap-4 group hover-lift p-2 -m-2 rounded-lg transition-all duration-200">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--warning)]/10 transition-all duration-200 group-hover:bg-[var(--warning)]/20 group-hover:scale-105">
                <svg className="h-5 w-5 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="pt-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Track everything</span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)] leading-relaxed">Dashboard to monitor all your applications</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-center text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            aria-label="Sign in with Google"
            className="google-btn google-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin text-[var(--text-muted)]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Signing in…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {/* Trust signal */}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Secure sign-in · No password required
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[var(--text-secondary)]">
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-[var(--accent-hover)] underline underline-offset-2 transition-colors hover:text-[var(--accent-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] rounded-sm">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-[var(--accent-hover)] underline underline-offset-2 transition-colors hover:text-[var(--accent-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] rounded-sm">
            Privacy Policy
          </a>.
        </p>
      </div>
    </main>
  );
}
