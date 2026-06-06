import nodemailer from 'nodemailer';
import { env } from './env.js';

export async function sendSessionTerminatedAlert(): Promise<void> {
  console.error('SESSION TERMINATED — re-scan QR to reconnect');

  if (!env.alertSmtpUser || !env.alertSmtpPassword) {
    console.warn('ALERT_SMTP_* not set — skipping email alert');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.alertSmtpUser, pass: env.alertSmtpPassword },
  });

  await transporter.sendMail({
    from: env.alertSmtpUser,
    to: env.alertEmail,
    subject: 'AetherLink bot session terminated — re-scan QR',
    text: 'Your AetherLink WhatsApp bot session was logged out. Open Railway logs, scan the new QR code, and reconnect within minutes.',
  });
}
