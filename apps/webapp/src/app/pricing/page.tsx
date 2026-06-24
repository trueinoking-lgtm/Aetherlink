'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  popular?: boolean;
  method: 'ecocash' | 'onemoney';
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Basic',
    price: 0,
    period: 'forever',
    description: 'Get started with job search essentials',
    features: [
      { name: 'Job Feed Access', included: true },
      { name: 'Manual Job Applications', included: true },
      { name: 'Basic CV Builder', included: true },
      { name: 'Application Tracker', included: true },
      { name: 'AI Job Matching', included: false },
      { name: 'Auto-Apply', included: false },
      { name: 'Priority Support', included: false },
      { name: 'Advanced CV Tailoring', included: false },
    ],
    cta: 'Current Plan',
    method: 'ecocash',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'per month',
    description: 'Unlock the full power of AetherLink',
    features: [
      { name: 'Job Feed Access', included: true },
      { name: 'Manual Job Applications', included: true },
      { name: 'Advanced CV Builder + AI', included: true },
      { name: 'Application Tracker', included: true },
      { name: 'AI Job Matching', included: true },
      { name: 'Auto-Apply (50/month)', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Advanced CV Tailoring', included: true },
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    method: 'ecocash',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'ecocash' | 'onemoney'>('ecocash');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiating' | 'waiting' | 'success' | 'error'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [pollUrl, setPollUrl] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  async function handleUpgrade() {
    if (!isAuthenticated) {
      router.push('/?upgrade=pro');
      return;
    }

    setShowPaymentModal(true);
    setPaymentStatus('idle');
    setPaymentMessage('');
  }

  async function initiatePayment() {
    if (!phone || !/^2637[78]\d{7,8}$/.test(phone.replace(/\s+/g, ''))) {
      setPaymentStatus('error');
      setPaymentMessage('Enter a valid EcoCash or OneMoney number (e.g. 0771234567)');
      return;
    }

    setPaymentStatus('initiating');
    setPaymentMessage('Connecting to Paynow...');

    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\s+/g, ''),
          amount: 9.99,
          plan: 'pro',
          method: selectedMethod,
        }),
      });

      const data = await res.json();

      if (data.success && data.pollUrl) {
        setPaymentStatus('waiting');
        setPaymentMessage(data.instructions || 'Check your phone - a USSD prompt has appeared. Enter your PIN to confirm $9.99 payment.');
        setPollUrl(data.pollUrl);
        startPolling(data.pollUrl);
      } else {
        setPaymentStatus('error');
        setPaymentMessage(data.error || 'Payment failed. Please try again.');
      }
    } catch {
      setPaymentStatus('error');
      setPaymentMessage('Network error. Check your connection and try again.');
    }
  }

  function startPolling(url: string) {
    let attempts = 0;
    const maxAttempts = 36; // 3 minutes (every 5s)

    const interval = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(interval);
        setPaymentStatus('error');
        setPaymentMessage('Payment timed out. If you already paid, contact support.');
        return;
      }

      try {
        const res = await fetch(`/api/pay?poll=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.paid) {
          clearInterval(interval);
          setPaymentStatus('success');
          setPaymentMessage('Payment confirmed! Your Pro subscription is now active.');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } catch {
        // Keep polling
      }
    }, 5000);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-[var(--text-primary)]">
            Aether<span className="gradient-text">Link</span>
          </span>
        </a>
        <a href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          ← Back to Home
        </a>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready to accelerate your job search with AI-powered tools.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)]">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Pay with EcoCash or OneMoney - instant activation
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                plan.popular
                  ? 'border-[var(--accent)] bg-[var(--glass-bg)] shadow-lg shadow-[var(--accent)]/10 scale-[1.02]'
                  : 'border-[var(--border)] bg-[var(--glass-bg)] hover:border-[var(--accent)]/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-btn)] px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{plan.description}</p>

              <div className="mt-6 mb-8">
                <span className="text-4xl font-bold text-[var(--text-primary)]">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-[var(--text-muted)]">/{plan.period}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={feature.included ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.price === 0 ? (
                <button
                  disabled
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--text-muted)] cursor-not-allowed"
                >
                  {plan.cta}
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  className={`w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all pointer-active ${
                    plan.popular
                      ? 'premium-btn bg-[var(--accent-btn)] text-white hover:opacity-90'
                      : 'premium-btn premium-btn-secondary'
                  }`}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-xs text-[var(--text-muted)]">Secured by Paynow Zimbabwe • EcoCash & OneMoney supported</p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Complete Payment</h2>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentStatus('idle'); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {paymentStatus === 'idle' && (
              <>
                <div className="mb-6 rounded-xl bg-[var(--glass-bg)] p-4 border border-[var(--border)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">AetherLink Pro</span>
                    <span className="font-semibold text-[var(--text-primary)]">$9.99/month</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedMethod('ecocash')}
                        className={`rounded-xl border p-3 text-center text-sm font-medium transition-all ${
                          selectedMethod === 'ecocash'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-active)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                        }`}
                      >
                        EcoCash
                      </button>
                      <button
                        onClick={() => setSelectedMethod('onemoney')}
                        className={`rounded-xl border p-3 text-center text-sm font-medium transition-all ${
                          selectedMethod === 'onemoney'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-active)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                        }`}
                      >
                        OneMoney
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0771234567"
                      className="premium-input w-full"
                    />
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Enter your {selectedMethod === 'ecocash' ? 'EcoCash' : 'OneMoney'} registered number
                    </p>
                  </div>
                </div>

                <button
                  onClick={initiatePayment}
                  className="mt-6 w-full rounded-xl bg-[var(--accent-btn)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 pointer-active"
                >
                  Pay $9.99 via {selectedMethod === 'ecocash' ? 'EcoCash' : 'OneMoney'}
                </button>
              </>
            )}

            {paymentStatus === 'initiating' && (
              <div className="flex flex-col items-center py-8">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                <p className="mt-4 text-sm text-[var(--text-secondary)]">{paymentMessage}</p>
              </div>
            )}

            {paymentStatus === 'waiting' && (
              <div className="flex flex-col items-center py-8">
                <div className="relative mb-4">
                  <div className="h-16 w-16 rounded-full border-2 border-[var(--accent)]/30 flex items-center justify-center">
                    <svg className="h-8 w-8 text-[var(--accent)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--accent)] animate-ping" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Check Your Phone</h3>
                <p className="text-center text-sm text-[var(--text-secondary)] max-w-xs">
                  {paymentMessage}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Waiting for confirmation...
                </div>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="flex flex-col items-center py-8">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Payment Successful!</h3>
                <p className="text-center text-sm text-[var(--text-secondary)]">
                  {paymentMessage}
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Redirecting to dashboard...</p>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="flex flex-col items-center py-8">
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Payment Failed</h3>
                <p className="text-center text-sm text-[var(--text-secondary)] max-w-xs">
                  {paymentMessage}
                </p>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="mt-4 rounded-xl border border-[var(--border)] px-6 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pointer-active"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
