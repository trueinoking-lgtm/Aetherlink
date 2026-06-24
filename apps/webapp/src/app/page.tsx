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
    <main className="login-page relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-base)]">
      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-[var(--text-primary)]">
            Aether<span className="gradient-text">Link</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
          <a href="#dashboard" className="transition-colors hover:text-[var(--text-primary)]">Dashboard</a>
          <a href="#cv" className="transition-colors hover:text-[var(--text-primary)]">CV Builder</a>
          <a href="#tracker" className="transition-colors hover:text-[var(--text-primary)]">Tracker</a>
          <a href="/pricing" className="transition-colors hover:text-[var(--text-primary)]">Pricing</a>
          <a href="/terms" className="transition-colors hover:text-[var(--text-primary)]">Privacy</a>
        </div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="premium-btn premium-btn-secondary text-sm pointer-active"
        >
          Sign in
        </button>
      </nav>

      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bg-orb absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="bg-orb-delayed absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="bg-orb-slow absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--accent)]/3 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg-base)_70%)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl">

          {/* Hero Section */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              <div className="mb-6 animate-fade-in">
                <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                  Aether<span className="gradient-text gradient-text-animated">Link</span>
                </h1>
                <p className="mt-3 text-lg font-medium text-[var(--text-primary)] sm:text-xl">
                  Find jobs. Apply instantly.
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  AI job matching, auto-apply, and application tracking in one tool.
                </p>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 animate-fade-in">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  aria-label="Sign in with Google"
                  className="google-btn google-btn-primary pointer-active"
                >
                  {isLoading ? 'Signing in…' : 'Sign in with Google'}
                </button>
                <a
                  href="/pricing"
                  className="premium-btn text-sm font-semibold pointer-active !py-2.5 !px-5"
                >
                  Go Pro - $9.99/mo
                </a>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-center text-sm text-[var(--danger)]" role="alert">
                  {error}
                </div>
              )}
            </div>

            {/* Right: Dashboard Preview */}
            <div className="relative mt-8 lg:mt-0 animate-slide-up">
              <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl shadow-[var(--accent)]/5">
                <div className="rounded-xl bg-[var(--bg-base)] p-4 min-h-[320px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-[var(--accent)]/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[var(--accent)]">A</span>
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">AetherLink</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">Good morning, Tafadzwa</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-[var(--surface)] p-2 text-center">
                      <p className="text-[10px] text-[var(--text-muted)]">Jobs Found</p>
                      <p className="text-sm font-bold text-[var(--accent)]">12</p>
                    </div>
                    <div className="rounded-lg bg-[var(--surface)] p-2 text-center">
                      <p className="text-[10px] text-[var(--text-muted)]">Applied</p>
                      <p className="text-sm font-bold text-[var(--success)]">3</p>
                    </div>
                    <div className="rounded-lg bg-[var(--surface)] p-2 text-center">
                      <p className="text-[10px] text-[var(--text-muted)]">Avg Match</p>
                      <p className="text-sm font-bold text-[var(--warning)]">78%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { title: 'Frontend Engineer', company: 'TechCorp Africa', score: 85 },
                      { title: 'Full-Stack Developer', company: 'Harare Labs', score: 72 },
                      { title: 'UI/UX Designer', company: 'StartupZW', score: 45 },
                    ].map((job, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--surface)] p-2">
                        <div className="h-7 w-7 shrink-0 rounded-md bg-[var(--accent)]/10 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[var(--accent)]">{job.company.charAt(0)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{job.title}</p>
                          <p className="text-[9px] text-[var(--text-muted)]">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-12 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${job.score >= 70 ? 'bg-[var(--match-high)]' : job.score >= 50 ? 'bg-[var(--match-mid)]' : 'bg-[var(--match-low)]'}`}
                              style={{ width: `${job.score}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${job.score >= 70 ? 'text-[var(--match-high)]' : job.score >= 50 ? 'text-[var(--match-mid)]' : 'text-[var(--match-low)]'}`}>
                            {job.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-[var(--accent)]/20 via-transparent to-[var(--success)]/20 blur-xl" />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div id="features" className="mt-20">
            <h2 className="text-center font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl mb-10">
              Everything you need to land your next job
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr] stagger-children">
              <div className="flex items-start gap-4 group p-5 -m-1 rounded-xl border border-transparent transition-all duration-200 hover:bg-[var(--glass-bg-subtle)] hover:border-[var(--border)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition-all duration-200 group-hover:bg-[var(--accent)]/20 group-hover:scale-105">
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="pt-0.5 min-w-0">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Auto-apply to jobs</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-secondary)] leading-relaxed">Apply to hundreds of jobs with one click via Gmail integration</span>
                </div>
              </div>
              <div className="flex items-start gap-4 group p-5 -m-1 rounded-xl border border-transparent transition-all duration-200 hover:bg-[var(--glass-bg-subtle)] hover:border-[var(--border)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--success)]/10 transition-all duration-200 group-hover:bg-[var(--success)]/20 group-hover:scale-105">
                  <svg className="h-5 w-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="pt-0.5 min-w-0">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Smart matching</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-secondary)] leading-relaxed">AI scores each job against your skills and profile</span>
                </div>
              </div>
              <div className="flex items-start gap-4 group p-5 -m-1 rounded-xl border border-transparent transition-all duration-200 hover:bg-[var(--glass-bg-subtle)] hover:border-[var(--border)] sm:col-span-2 lg:col-span-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--warning)]/10 transition-all duration-200 group-hover:bg-[var(--warning)]/20 group-hover:scale-105">
                  <svg className="h-5 w-5 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="pt-0.5 min-w-0">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Track everything</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-secondary)] leading-relaxed">Dashboard and tracker to monitor all your applications</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Section */}
          <div id="dashboard" className="mt-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl mb-4">
                  Your job search at a glance
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  See matched jobs, application stats, and your average match score on one dashboard. Get a personalized greeting and quick access to every part of the app.
                </p>
                <ul className="space-y-3">
                  {[
                    'Jobs found and match scores per role',
                    'Applications sent counter',
                    'Average match rate across all jobs',
                    'Quick links: View Jobs, My CV, Applications',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-5 rounded bg-[var(--accent)]/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-[var(--accent)]">A</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-[var(--surface)] p-3 text-center">
                    <p className="text-[10px] text-[var(--text-muted)]">Jobs Found</p>
                    <p className="text-lg font-bold text-[var(--accent)]">12</p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface)] p-3 text-center">
                    <p className="text-[10px] text-[var(--text-muted)]">Applied</p>
                    <p className="text-lg font-bold text-[var(--success)]">3</p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface)] p-3 text-center">
                    <p className="text-[10px] text-[var(--text-muted)]">Avg Match</p>
                    <p className="text-lg font-bold text-[var(--warning)]">78%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { title: 'Frontend Engineer', company: 'TechCorp Africa', score: 85, color: 'var(--match-high)' },
                    { title: 'Full-Stack Developer', company: 'Harare Labs', score: 72, color: 'var(--match-high)' },
                    { title: 'UI/UX Designer', company: 'StartupZW', score: 45, color: 'var(--match-low)' },
                  ].map((job, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--surface)] p-3">
                      <div className="h-8 w-8 shrink-0 rounded-md bg-[var(--accent)]/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[var(--accent)]">{job.company.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--text-primary)]">{job.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${job.score}%`, backgroundColor: job.color }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold" style={{ color: job.color }}>{job.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CV Builder Section */}
          <div id="cv" className="mt-20">
            <div className="max-w-2xl mx-auto text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl mb-4">
                Build your CV with AI
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Answer a few questions and let AI extract your details. Get a strength score showing what to improve, then generate a PDF ready to send.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-5 rounded bg-[var(--accent)]/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-[var(--accent)]">CV</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">AI CV Builder</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg bg-[var(--surface)] p-3">
                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Interview question</p>
                    <p className="text-xs text-[var(--text-secondary)]">Tell me about yourself and what kind of role you are looking for.</p>
                  </div>
                  <div className="rounded-lg bg-[var(--accent)]/10 p-3 border border-[var(--accent)]/20">
                    <p className="text-[10px] text-[var(--accent)] mb-1">Your answer</p>
                    <p className="text-xs text-[var(--text-secondary)]">I am a software developer with 3 years of experience in React and Node.js...</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)]">CV Strength</p>
                      <p className="text-sm font-bold text-[var(--success)]">72 / 100</p>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--success)]" style={{ width: '72%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <ul className="space-y-3">
                  {[
                    'AI interview that extracts your details',
                    'Strength score with missing items highlighted',
                    'Auto-generates a polished PDF',
                    'Saves to your profile for future applications',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)] text-left">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tracker Section */}
          <div id="tracker" className="mt-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl mb-4">
                  Track every application
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  Mark jobs as saved or applied, record outcomes, and see your pipeline in one place. Know exactly where you stand with every company.
                </p>
                <ul className="space-y-3">
                  {[
                    'Mark jobs: saved, applied, interview, offer',
                    'Outcome tracking: still waiting, no response, offer',
                    'Filter by status: all, saved, applied',
                    'Source tracking: where you found each job',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-5 rounded bg-[var(--accent)]/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-[var(--accent)]">T</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Application Tracker</span>
                </div>
                <div className="space-y-3">
                  {[
                    { title: 'Frontend Engineer', company: 'TechCorp Africa', status: 'interview', date: 'Jun 18' },
                    { title: 'Full-Stack Developer', company: 'Harare Labs', status: 'offer', date: 'Jun 15' },
                    { title: 'UI/UX Designer', company: 'StartupZW', status: 'no_response', date: 'Jun 12' },
                  ].map((app, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--text-primary)]">{app.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{app.company} · {app.date}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        app.status === 'offer' ? 'bg-[var(--success)]/15 text-[var(--success)]' :
                        app.status === 'interview' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' :
                        'bg-[var(--text-muted)]/15 text-[var(--text-muted)]'
                      }`}>
                        {app.status === 'offer' ? 'Got an offer' : app.status === 'interview' ? 'Interview' : 'No response'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sign In Card */}
          <div className="mt-20 flex justify-center">
            <div className="login-card glass-card p-8 login-card-glow animate-slide-up w-full max-w-md">
              <h2 className="text-lg font-bold text-[var(--text-primary)] text-center mb-6">Get started in seconds</h2>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-center text-sm text-[var(--danger)]" role="alert">
                  {error}
                </div>
              )}

              {/* Sign in button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                aria-label="Sign in with Google"
                className="google-btn google-btn-primary disabled:opacity-50 disabled:cursor-not-allowed pointer-active"
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
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Secure sign-in · No password required
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-12 text-center text-xs text-[var(--text-secondary)]">
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
      </div>
    </main>
  );
}
