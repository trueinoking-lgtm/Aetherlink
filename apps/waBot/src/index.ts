import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { env } from './env.js';
import { sendSessionTerminatedAlert } from './alerts.js';
import { processMessage } from './pipeline.js';
import { supabase } from './supabase.js';

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

function extractText(msg: unknown): string {
  if (!msg || typeof msg !== 'object' || !('message' in msg)) return '';
  const body = (msg as { message?: Record<string, unknown> | null }).message;
  if (!body) return '';
  if (typeof body.conversation === 'string') return body.conversation;
  const ext = body.extendedTextMessage;
  if (ext && typeof ext === 'object' && typeof (ext as { text?: string }).text === 'string') {
    return (ext as { text: string }).text;
  }
  // channel/newsletter messages
  const newslet = body.newsletterAdminInviteMessage;
  if (newslet && typeof newslet === 'object' && typeof (newslet as { caption?: string }).caption === 'string') {
    return (newslet as { caption: string }).caption;
  }
  // image/video captions from channels
  const img = body.imageMessage;
  if (img && typeof img === 'object' && typeof (img as { caption?: string }).caption === 'string') {
    return (img as { caption: string }).caption;
  }
  const vid = body.videoMessage;
  if (vid && typeof vid === 'object' && typeof (vid as { caption?: string }).caption === 'string') {
    return (vid as { caption: string }).caption;
  }
  return '';
}

async function handleDirectJobsQuery(sock: WASocket, jid: string) {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, companyName')
    .eq('is_shared', true)
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!jobs?.length) {
    await sock.sendMessage(jid, { text: 'No new jobs right now. Check back soon.' });
    return;
  }

  const message = jobs
    .map(
      (j, i) =>
        `${i + 1}. ${j.title}${j.companyName ? ` — ${j.companyName}` : ''}\n${env.webappBaseUrl}/j/${j.id}`,
    )
    .join('\n\n');

  await sock.sendMessage(jid, { text: `Latest jobs:\n\n${message}` });
}

export async function startBot(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(env.sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    version,
    browser: Browsers.macOS('Safari'),
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    await sock.waitForConnectionUpdate((u) => !!u.qr);
    const phoneNumber = env.botPhoneNumber.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`=============================`);
    console.log(`PAIRING CODE: ${code}`);
    console.log(`=============================`);
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('WhatsApp connected');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (!shouldReconnect) {
        await sendSessionTerminatedAlert();
        return;
      }

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 60000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
        setTimeout(() => {
          startBot().catch(console.error);
        }, delay);
      } else {
        console.error('Max reconnect attempts reached');
        await sendSessionTerminatedAlert();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid || '';
      const isDirect = jid.endsWith('@s.whatsapp.net');
      const isGroup = jid.endsWith('@g.us');
      const isChannel = jid.endsWith('@newsletter');

      // skip anything that isn't a direct message, group, or channel
      if (!isDirect && !isGroup && !isChannel) continue;

      const text = extractText(msg);
      if (!text) continue;

      console.log(`[${isChannel ? 'CHANNEL' : isGroup ? 'GROUP' : 'DM'}] ${jid}: ${text.slice(0, 80)}`);

      const normalized = text.toLowerCase().trim();
      if (isDirect && (normalized === 'jobs' || normalized === 'find jobs')) {
        await handleDirectJobsQuery(sock, jid);
        continue;
      }

      await processMessage(text, jid, isDirect);
    }
  });
}

startBot().catch((err) => {
  console.error('Bot failed to start', err);
  process.exit(1);
});
