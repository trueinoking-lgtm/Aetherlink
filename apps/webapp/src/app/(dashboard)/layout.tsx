'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSdk } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';
import type { Profile } from '@aetherlink/core';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { AetherProviders } from '@/components/AetherProviders';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const sdk = useSdk() as AetherLinkSupabaseApi;
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const isDebug = window.location.search.includes('debug=true');
      if (isDebug) {
        setProfile({
          id: 1,
          user_id: 'debug-user',
          full_name: 'Debug User',
          location: 'Harare',
          preferred_job_types: ['Tech'],
          salary_floor: 0,
          auto_apply_enabled: false,
          auto_apply_threshold: 80,
          skills: ['JavaScript', 'TypeScript', 'React'],
          headline: 'Full Stack Developer',
          subscription_end_date: new Date().toISOString(),
          subscription_tier: 'basic' as const,
          is_trial: false,
        } as Profile);
        setLoading(false);
        return;
      }

      try {
        const { user } = await sdk.getUser();
        if (!user) {
          router.push('/');
          return;
        }
        const prof = await sdk.getAetherLinkProfile();
        if (!prof?.full_name) {
          router.push('/onboarding');
          return;
        }
        setProfile(prof);
      } catch (e) {
        console.error('Dashboard layout error:', e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk, router]);

  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading AetherLink…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] relative">
      {/* Subtle background pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--bg-base)_70%)]" />
      </div>
      {/* Sidebar: hidden on mobile, shown on md+ */}
      <div className="hidden md:block relative z-10">
        <Sidebar profile={profile} collapsed={collapsed} onToggle={toggleSidebar} />
      </div>
      {/* Bottom nav: shown on mobile, hidden on md+ */}
      <BottomNav />
      <main
        id="main-content"
        className={`relative z-10 transition-all duration-200 pb-20 md:pb-0 page-transition ${
          collapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
      >
        <div className="page-wrapper">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AetherProviders>
      <DashboardShell>{children}</DashboardShell>
    </AetherProviders>
  );
}
