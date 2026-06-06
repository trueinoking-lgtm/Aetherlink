'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginCard } from '@aetherlink/ui/auth/loginCard';

import { login, signup } from './actions';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function handleLogin({ email, password }: { email: string; password: string }) {
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  async function handleSignup({ email, password }: { email: string; password: string }) {
    if (!consent) {
      setError('Please accept the privacy policy to continue.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }
    router.push('/onboarding');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] p-4">
      <h1 className="font-display mb-8 text-3xl font-bold text-[var(--text-primary)]">
        Aether<span className="text-[var(--accent)]">Link</span>
      </h1>
      <div className="flex flex-col items-center gap-4">
        <div className="mb-2 flex gap-2 text-sm">
          <button
            type="button"
            className={mode === 'login' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
            onClick={() => setMode('login')}
          >
            Log in
          </button>
          <span className="text-[var(--text-muted)]">|</span>
          <button
            type="button"
            className={mode === 'signup' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>
        <LoginCard
          onLoginWithEmail={mode === 'login' ? handleLogin : handleSignup}
          isSubmitting={isSubmitting}
        />
        {mode === 'signup' && (
          <label className="flex max-w-80 items-start gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to AetherLink&apos;s{' '}
              <Link href="/privacy" className="text-[var(--accent)] underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
        )}
        {error && (
          <div className="w-full max-w-80 rounded-md bg-[var(--danger)]/10 px-3 py-2 text-center text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
