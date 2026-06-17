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
          id: 'debug-user',
          user_id: 'debug-user',
          full_name: 'Debug User',
          location: 'Harare',
          preferred_job_types: ['Tech'],
          salary_floor: 0,
          auto_apply_enabled: false,
          auto_apply_threshold: 80,
          skills: ['JavaScript', 'TypeScript', 'React'],
          headline: 'Full Stack Developer',
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
          // New user — redirect to onboarding
          router.push('/onboarding');
          return;
        }
        setProfile(prof);
      } catch (e) {
        console.error('Dashboard layout error:', e);
        // Don't redirect to login on profile fetch errors - let the page render
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
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Sidebar profile={profile} collapsed={collapsed} onToggle={toggleSidebar} />
      <BottomNav />
      <main
        className={`transition-all duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        } pb-20 md:pb-0`}
      >
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
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