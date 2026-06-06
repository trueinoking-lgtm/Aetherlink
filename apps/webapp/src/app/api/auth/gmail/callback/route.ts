import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/gmail/crypto';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/feed?gmail=error`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/feed?gmail=error`);
  }

  const tokens = (await tokenRes.json()) as {
    refresh_token?: string;
    access_token?: string;
  };

  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${origin}/feed?gmail=no_refresh`);
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const googleProfile = (await profileRes.json()) as { email?: string };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/`);
  }

  await supabase
    .from('profiles')
    .update({
      gmail_email: googleProfile.email,
      gmail_refresh_token_encrypted: encryptToken(tokens.refresh_token),
    })
    .eq('user_id', user.id);

  return NextResponse.redirect(`${origin}/feed?gmail=connected`);
}
