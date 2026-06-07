import 'dotenv/config';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  fireworksApiKey: process.env.FIREWORKS_API_KEY || '',
  botUserId: requireEnv('AETHERLINK_BOT_USER_ID'),
  sessionPath: process.env.SESSION_PATH || './session',
  alertEmail: process.env.ALERT_EMAIL || 'trueinoking@gmail.com',
  alertSmtpUser: process.env.ALERT_SMTP_USER || '',
  alertSmtpPassword: process.env.ALERT_SMTP_APP_PASSWORD || '',
  webappBaseUrl: process.env.WEBAPP_BASE_URL || 'https://aetherlink.app',
  botPhoneNumber: requireEnv('BOT_PHONE_NUMBER'),
};
