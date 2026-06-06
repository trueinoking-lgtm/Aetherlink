import { decryptToken } from './crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function getGmailAccessToken(encryptedRefreshToken: string): Promise<string> {
  const refreshToken = decryptToken(encryptedRefreshToken);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Gmail token: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function sendGmailMessage({
  accessToken,
  fromName,
  fromEmail,
  to,
  subject,
  bodyText,
  pdfBase64,
  pdfFilename,
}: {
  accessToken: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  bodyText: string;
  pdfBase64: string;
  pdfFilename: string;
}): Promise<void> {
  const boundary = `boundary_${Date.now()}`;
  const mime = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyText,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    '',
    pdfBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const raw = Buffer.from(mime).toString('base64url');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    throw new Error(`Gmail send failed: ${await res.text()}`);
  }
}
