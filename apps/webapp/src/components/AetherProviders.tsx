'use client';

import { useMemo } from 'react';
import { Toaster } from '@aetherlink/ui/components/ui/toaster';
import { SdkProvider } from '@aetherlink/ui/hooks/useSdk';
import { AetherLinkSupabaseApi } from '@aetherlink/ui/lib/supabaseApi';

import { createClient } from '@/lib/supabase/client';

export function AetherProviders({ children }: { children: React.ReactNode }) {
  const sdk = useMemo(() => new AetherLinkSupabaseApi(createClient()), []);

  return (
    <SdkProvider sdk={sdk}>
      {children}
      <Toaster />
    </SdkProvider>
  );
}
