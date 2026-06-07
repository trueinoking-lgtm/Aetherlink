import { type CookieMethodsServer, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      supabaseResponse = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
    },
  };

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: cookieMethods,
  });

  // Refresh the session — do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname === '/';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/');
  const isPublicPage = request.nextUrl.pathname === '/privacy';

  // Unauthenticated → redirect to login
  if (!user && !isAuthPage && !isAuthCallback && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Already logged in on login page → redirect to feed
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/feed';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
