import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/|favicon.ico|favicons|manifest.json|sw.js|register-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map|woff|woff2)$).*)',
  ],
};
