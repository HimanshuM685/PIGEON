import express from 'express';
import { getIntent, type IntentResult } from './intent';
import { sendAlgo } from './send';
import { getBalance } from './balance';
import { getAddress } from './address';
import { onboardUser } from './onboard';
import { fundUser } from './fund';
import { getTransactions } from './transactions';

// ─── httpSMS CloudEvents Payload Types ───────────────────────────────────────

export interface HttpSmsEventData {
  contact: string;       // sender phone (incoming) or recipient (outgoing)
  content: string;       // SMS body text
  message_id?: string;
  id?: string;           // present on outgoing events
  owner: string;         // your httpSMS phone number
  request_id?: string;
  sim?: string;          // SIM1 or SIM2
  timestamp: string;
  user_id: string;
}

export interface HttpSmsEvent {
  data: HttpSmsEventData;
  datacontenttype: string;
  id: string;
  source: string;
  specversion: string;
  time: string;
  type:
  | 'message.phone.received'
  | 'message.phone.sent'
  | 'message.phone.delivered'
  | 'message.send.failed'
  | 'message.send.expired'
  | 'message.call.missed'
  | string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ─── httpSMS Send API ────────────────────────────────────────────────────────

const HTTPSMS_API_URL = 'https://api.httpsms.com/v1/messages/send';
const HTTPSMS_MAX_CONTENT_LENGTH = 2048;

/**
 * Send an SMS reply through the httpSMS API.
 * Requires HTTPSMS_API_KEY and HTTPSMS_OWNER_PHONE env vars.
 */
async function sendSmsViaHttpSms(to: string, content: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.HTTPSMS_API_KEY;
  const ownerPhone = process.env.HTTPSMS_OWNER_PHONE;

  if (!apiKey || !ownerPhone) {
    console.warn('httpSMS API key or owner phone not configured — skipping SMS reply');
    return { success: false, error: 'HTTPSMS_API_KEY or HTTPSMS_OWNER_PHONE not set' };
  }

  try {
    const safeContent =
      content.length > HTTPSMS_MAX_CONTENT_LENGTH
        ? `${content.slice(0, HTTPSMS_MAX_CONTENT_LENGTH - 20)}\n...[truncated]`
        : content;

    const res = await fetch(HTTPSMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        content: safeContent,
        from: ownerPhone,
        to,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`httpSMS send failed (${res.status}):`, body);
      return { success: false, error: `httpSMS API ${res.status}: ${body}` };
    }

    const json = await res.json();
    console.log('httpSMS reply sent successfully:', json);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('httpSMS send error:', msg);
    return { success: false, error: msg };
  }
}

// ─── Pending Sessions (two-step password flow) ─────────────────────────────

interface PendingSession {
  action: 'send' | 'onboard' | 'get_pvt_key';
  /** Send params (only for 'send') */
  sendParams?: { amount: string; asset?: string; to: string };
  /** Optional: imported mnemonic for onboarding */
  onboardMnemonic?: string;
  createdAt: number;
}

/** phone → pending session awaiting password */
const pendingSessions = new Map<string, PendingSession>();

/** Sessions expire after 5 minutes */
const SESSION_TTL_MS = 5 * 60 * 1000;

function normalizeSessionPhone(phone: string): string {
  return phone.replace(/\D/g, '').trim() || phone;
}

// ─── Webhook Processing ─────────────────────────────────────────────────────

interface SmsProcessResult {
  reply: string;
  containedPassword: boolean;
}

function getCommandMenuReply(): string {
  return [
    '👋 Welcome to PIGEON SMS Wallet!',
    '',
    'Available commands:',
    '• "hello" / "help" / "commands" — show this menu',
    '• "balance" — check wallet balance',
    '• "address" — get your wallet address',
    '• "create wallet" — create a new wallet',
    '• "import wallet [mnemonic words]" — import wallet',
    '• "send [amount] ALGO to [address/phone]" — send ALGO',
    '• "fund me" — request testnet funds',
    '• "get pvt key" — export recovery phrase',
    '• "get txn" — show last 5 transactions',
  ].join('\n');
}

/**
 * Process an incoming SMS from httpSMS webhook, classify intent via OpenRouter,
 * execute the action, and return a human-readable reply.
 *
 * Two-step flow for send & onboard:
 *   Step 1 — user sends command (no password) → system asks for password
 *   Step 2 — user replies with just the password → system executes + warns to delete
 */
async function processIncomingSms(from: string, message: string): Promise<SmsProcessResult> {
  const normalizedMessage = message.trim().toLowerCase();

  if ([
    'hello',
    'hi',
    'hey',
    'help',
    'menu',
    'commands',
    'start',
  ].includes(normalizedMessage)) {
    return { reply: getCommandMenuReply(), containedPassword: false };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      reply: `!!! Server error: AI classifier not configured\n\n${getCommandMenuReply()}`,
      containedPassword: false,
    };
  }

  const normPhone = normalizeSessionPhone(from);

  // ── Check if there's a pending session waiting for a password ──────────
  const pending = pendingSessions.get(normPhone);
  if (pending) {
    pendingSessions.delete(normPhone);

    // Check session expiry
    if (Date.now() - pending.createdAt > SESSION_TTL_MS) {
      return { reply: '!!! Session expired. Please start your command again.', containedPassword: false };
    }

    const password = message.trim();
    if (!password) {
      return { reply: '!!! Empty password received. Please start your command again.', containedPassword: false };
    }

    // Execute the pending action with the password
    if (pending.action === 'onboard') {
      return await executeOnboard(from, password, pending.onboardMnemonic);
    }
    if (pending.action === 'send' && pending.sendParams) {
      return await executeSend(from, password, pending.sendParams);
    }
    if (pending.action === 'get_pvt_key') {
      return await executeGetPvtKey(from, password);
    }

    return { reply: '!!! Something went wrong with the pending session. Please try again.', containedPassword: false };
  }

  // ── Normal intent classification ───────────────────────────────────────
  try {
    const intentResult: IntentResult = await getIntent(message, apiKey);
    console.log('Intent classified:', intentResult.intent, intentResult.params);

    switch (intentResult.intent) {
      case 'get_balance': {
        const result = await getBalance(from, { asset: intentResult.params.asset });
        if (result.success) {
          return { reply: `$$ Balance: ${result.balance} ${result.asset ?? 'ALGO'}`, containedPassword: false };
        }
        return { reply: `!!! Balance check failed: ${result.error ?? 'Unknown error'}`, containedPassword: false };
      }

      case 'get_address': {
        const result = await getAddress(from);
        if (result.success) {
          return { reply: `>> Your ALGO address:\n${result.address}`, containedPassword: false };
        }
        return { reply: `!!! Address lookup failed: ${result.error ?? 'Unknown error'}`, containedPassword: false };
      }

      case 'get_txn': {
        const txnResult = await getTransactions(from, 5);
        if (txnResult.success && txnResult.transactions?.length) {
          const lines = txnResult.transactions.map((tx, i) => {
            const dir = tx.sender === txnResult.address ? '<Sent' : '>Received';
            const amt = tx.amount ? `${tx.amount} ALGO` : tx.type;
            const date = tx.roundTime.slice(0, 10);
            return `${i + 1}. ${dir} ${amt} (${date})\n   ${tx.explorerUrl}`;
          });
          return { reply: `# Last ${txnResult.transactions.length} transactions:\n\n${lines.join('\n\n')}`, containedPassword: false };
        }
        if (txnResult.success) {
          return { reply: '# No transactions found for your account.', containedPassword: false };
        }
        return { reply: `!!! Transaction history failed: ${txnResult.error ?? 'Unknown error'}`, containedPassword: false };
      }

      case 'send': {
        const to = intentResult.params.to ?? '';
        const amount = intentResult.params.amount ?? '0';
        if (!to) {
          return { reply: '!!! Recipient is required.\nFormat: send [amount] ALGO to [address/phone]', containedPassword: false };
        }

        // If user included password in the message, execute immediately
        if (intentResult.params.password) {
          return await executeSend(from, intentResult.params.password, { amount, asset: intentResult.params.asset, to });
        }

        // Step 1: Store pending session and ask for password
        pendingSessions.set(normPhone, {
          action: 'send',
          sendParams: { amount, asset: intentResult.params.asset, to },
          createdAt: Date.now(),
        });
        return {
          reply: `<< Send ${amount} ALGO to ${to}\n\n~~ Reply with your password to confirm:`,
          containedPassword: false,
        };
      }

      case 'onboard': {
        // If user included password in the message, execute immediately
        if (intentResult.params.password) {
          return await executeOnboard(from, intentResult.params.password, intentResult.params.mnemonic);
        }

        // Step 1: Store pending session and ask for password
        pendingSessions.set(normPhone, {
          action: 'onboard',
          onboardMnemonic: intentResult.params.mnemonic,
          createdAt: Date.now(),
        });
        return {
          reply: intentResult.params.mnemonic
            ? "Let's import your wallet from mnemonic.\n\n~~ Reply with your password to encrypt and secure it.\n!!! Remember it — it cannot be recovered!"
            : "Let's create your ALGO wallet!\n\n~~ Choose a password and reply with it.\n!!! Remember it — it cannot be recovered!",
          containedPassword: false,
        };
      }

      case 'fund': {
        const fundResult = await fundUser(from);
        if (fundResult.success) {
          return { reply: `# Funded 1 ALGO to your wallet!\n# ${fundResult.explorerUrl}`, containedPassword: false };
        }
        return { reply: `!!! Fund failed: ${fundResult.error ?? 'Unknown error'}`, containedPassword: false };
      }

      case 'get_pvt_key': {
        // If user included password in the message, execute immediately
        if (intentResult.params.password) {
          return await executeGetPvtKey(from, intentResult.params.password);
        }

        // Step 1: Ask for password
        pendingSessions.set(normPhone, {
          action: 'get_pvt_key',
          createdAt: Date.now(),
        });
        return {
          reply: '*** To export your private key, reply with your password:',
          containedPassword: false,
        };
      }

      default:
        return { reply: `?? Could not understand your request.\n\n${getCommandMenuReply()}`, containedPassword: false };
    }
  } catch (err) {
    console.error('Intent processing error:', err);
    return {
      reply: `!!! Processing failed: ${err instanceof Error ? err.message : String(err)}\n\n${getCommandMenuReply()}`,
      containedPassword: false,
    };
  }
}

// ─── Action executors (step 2) ──────────────────────────────────────────────

async function executeOnboard(
  from: string,
  password: string,
  mnemonic?: string
): Promise<SmsProcessResult> {
  const onboardResult = await onboardUser(from, password, mnemonic);
  if (onboardResult.alreadyOnboarded) {
    return { reply: `# You are already onboarded on ALGO!\nAddress: ${onboardResult.address ?? 'N/A'}`, containedPassword: true };
  }
  if (onboardResult.error) {
    return { reply: `!!! Onboard failed: ${onboardResult.error}`, containedPassword: true };
  }
  return {
    reply: onboardResult.importedMnemonic
      ? `Welcome! Your wallet has been imported successfully.\nAddress: ${onboardResult.address ?? 'N/A'}`
      : `Welcome! Your Falcon wallet is created.\nAddress: ${onboardResult.address ?? 'N/A'}`,
    containedPassword: true,
  };
}

async function executeSend(
  from: string,
  password: string,
  params: { amount: string; asset?: string; to: string },
): Promise<SmsProcessResult> {
  const sendResult = await sendAlgo(from, password, {
    amount: params.amount,
    asset: params.asset,
    to: params.to,
  });
  if (sendResult.success) {
    const explorerLine = 'explorerUrl' in sendResult && sendResult.explorerUrl
      ? `\n# ${sendResult.explorerUrl}`
      : '';
    return {
      reply: `<< Sent ${params.amount} ALGO to ${params.to}${explorerLine}`,
      containedPassword: true,
    };
  }
  return { reply: `!!! Send failed: ${sendResult.error ?? 'Unknown error'}`, containedPassword: true };
}

async function executeGetPvtKey(from: string, password: string): Promise<SmsProcessResult> {
  const { decryptWalletSecret } = await import('./crypto/walletSecret');
  const { findOnboardedUser } = await import('./onchain');
  const user = await findOnboardedUser(from);

  if (!user?.encrypted_mnemonic || !user?.address) {
    return { reply: '!!! Account not found or not onboarded.', containedPassword: true };
  }

  try {
    const secret = decryptWalletSecret(user.encrypted_mnemonic, password);
    return {
      reply: `# Your recovery phrase:\n\n${secret.mnemonic}\n\n!!!! NEVER share this with anyone! Delete this message immediately after saving it securely.`,
      containedPassword: true,
    };
  } catch {
    return { reply: '!!! Wrong password. Could not decrypt your private key.', containedPassword: true };
  }
}

// ─── JWT Validation (optional) ──────────────────────────────────────────────

/**
 * Validate the httpSMS webhook JWT signature.
 * If HTTPSMS_WEBHOOK_SIGNING_KEY is not set, validation is skipped.
 */
function validateWebhookSignature(authHeader: string | undefined): boolean {
  const signingKey = process.env.HTTPSMS_WEBHOOK_SIGNING_KEY;

  // If no signing key configured, skip validation (dev mode)
  if (!signingKey) {
    return true;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Webhook missing Authorization Bearer token');
    return false;
  }

  try {
    const token = authHeader.slice(7);
    // Decode JWT parts (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format');
      return false;
    }

    // Verify HMAC-SHA256 signature
    const crypto = require('crypto');
    const signatureInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto
      .createHmac('sha256', signingKey)
      .update(signatureInput)
      .digest('base64url');

    if (expectedSig !== parts[2]) {
      console.warn('JWT signature mismatch');
      return false;
    }

    // Check token expiry
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn('JWT token expired');
      return false;
    }

    return true;
  } catch (err) {
    console.error('JWT validation error:', err);
    return false;
  }
}

// ─── Route Setup ────────────────────────────────────────────────────────────

/**
 * Mount httpSMS webhook routes on the Express app.
 */
export function setupWebhookRoutes(app: express.Express): void {

  // ── Dedup: track recently processed event IDs ───────────────────────────
  const processedEvents = new Set<string>();
  const DEDUP_TTL_MS = 5 * 60 * 1000; // keep IDs for 5 minutes

  const handleHttpSmsWebhook = async (req: express.Request, res: express.Response) => {
    try {
      console.log(
        `[httpSMS] Webhook hit path=${req.path} content-type=${req.headers['content-type'] ?? 'unknown'}`
      );

      const payload = req.body as Record<string, unknown>;

      let eventType = 'message.phone.received';
      let eventId = '';
      let senderPhone = '';
      let smsContent = '';
      let ownerPhone = '';

      if (payload?.type && payload?.data && typeof payload.data === 'object') {
        const event = payload as unknown as HttpSmsEvent;
        eventType = event.type;
        eventId = event.id ?? '';
        senderPhone = event.data.contact ?? '';
        smsContent = event.data.content ?? '';
        ownerPhone = event.data.owner ?? '';
      } else if (typeof payload?.contact === 'string' && typeof payload?.content === 'string') {
        eventType = typeof payload.type === 'string' ? payload.type : 'message.phone.received';
        eventId = typeof payload.id === 'string' ? payload.id : '';
        senderPhone = payload.contact;
        smsContent = payload.content;
        ownerPhone = typeof payload.owner === 'string' ? payload.owner : '';
        console.warn('[httpSMS] Received non-CloudEvents payload; accepted via fallback parser');
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload: expected CloudEvents or { contact, content } format',
        });
      }

      // Validate webhook signature (if signing key is configured)
      if (!validateWebhookSignature(req.headers.authorization)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }

      console.log(`[httpSMS] Event received: ${eventType} | id=${eventId || 'n/a'}`);

      // ── Deduplicate: skip if we already processed this event ID ─────────
      if (eventId && processedEvents.has(eventId)) {
        console.log(`[httpSMS] Duplicate event ignored: ${eventId}`);
        return res.status(200).json({
          success: true,
          message: `Duplicate event ${eventId} ignored`,
        });
      }
      if (eventId) {
        processedEvents.add(eventId);
        setTimeout(() => processedEvents.delete(eventId), DEDUP_TTL_MS);
      }

      // ── Only process incoming SMS ───────────────────────────────────────
      if (eventType !== 'message.phone.received' && eventType !== 'message.received') {
        console.log(`[httpSMS] Acknowledged non-received event: ${eventType}`);
        return res.status(200).json({
          success: true,
          message: `Event ${eventType} acknowledged`,
        });
      }

      if (!senderPhone || !smsContent) {
        return res.status(400).json({
          success: false,
          error: 'Missing data.contact or data.content in received event',
        });
      }

      console.log(`[httpSMS] Incoming SMS from ${senderPhone} to ${ownerPhone}: "${smsContent}"`);

      // --- SKIP MECHANISM ---
      // Automatically skip service/promotional SMS (alphanumeric sender IDs like "ADIGKS", "VK-SBI")
      // A standard phone number should only contain '+', digits, and possibly spaces/hyphens
      const isServiceSms = /[a-zA-Z]/.test(senderPhone);
      
      if (isServiceSms) {
        console.log(`[httpSMS] Skipping SMS from service sender: ${senderPhone}`);
        return res.status(200).json({
          success: true,
          message: `SMS from ${senderPhone} skipped`
        });
      }

      // Process intent and generate reply
      const { reply: replyText, containedPassword } = await processIncomingSms(senderPhone, smsContent);
      console.log(`[httpSMS] Reply to ${senderPhone}: "${replyText}"`);

      // Send reply back via httpSMS API
      const sendResult = await sendSmsViaHttpSms(senderPhone, replyText);

      // If the user's SMS contained a password, send a follow-up security warning
      if (containedPassword) {
        const securityWarning = '## SECURITY WARNING: Your previous message contained your password in plain text. Please DELETE it from your message history immediately for your safety.';
        // Small delay so the warning arrives as a separate message after the main reply
        setTimeout(async () => {
          try {
            await sendSmsViaHttpSms(senderPhone, securityWarning);
            console.log(`[httpSMS] Security warning sent to ${senderPhone}`);
          } catch (err) {
            console.error('[httpSMS] Failed to send security warning:', err);
          }
        }, 2000);
      }

      res.status(200).json({
        success: true,
        message: 'SMS processed and reply sent',
        data: {
          from: senderPhone,
          owner: ownerPhone,
          intent_reply: replyText,
          sms_sent: sendResult.success,
          sms_send_error: sendResult.error,
          security_warning_queued: containedPassword,
        },
      });

    } catch (error) {
      console.error('[httpSMS] Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // ── httpSMS Webhook Endpoints (primary + alias) ─────────────────────────
  app.post('/api/sms-webhook', express.json({ type: '*/*' }), handleHttpSmsWebhook);
  app.post('/sms-webhook', express.json({ type: '*/*' }), handleHttpSmsWebhook);

  const handleEsp32Webhook = async (req: express.Request, res: express.Response) => {
    try {
      const { from, message, deviceId } = req.body;

      // Validate ESP32 payload
      if (!from || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing "from" or "message" in ESP32 payload',
        });
      }

      console.log(`[ESP32] SMS from ${from} (device: ${deviceId || 'unknown'}): "${message}"`);

      // Process intent and generate reply
      const { reply: replyText, containedPassword } = await processIncomingSms(from, message);
      console.log(`[ESP32] Reply to ${from}: "${replyText}"`);

      // For ESP32, we return the reply text for the device to send
      res.status(200).json({
        success: true,
        message: 'SMS processed successfully',
        data: {
          from,
          reply: replyText,
          containedPassword,
          deviceId: deviceId || 'unknown',
          // ESP32 should send this reply via SIM800L
          send_reply: true,
        },
      });

    } catch (error) {
      console.error('[ESP32] Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // ── ESP32/SIM800L Webhook Endpoints (primary + alias) ──────────────────
  app.post('/api/esp32-sms-webhook', express.json({ type: '*/*' }), handleEsp32Webhook);
  app.post('/esp32-sms-webhook', express.json({ type: '*/*' }), handleEsp32Webhook);

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/api/webhook-health', (_req, res) => {
    res.json({
      success: true,
      message: 'SMS webhook service is running',
      timestamp: new Date().toISOString(),
      endpoints: {
        httpsms: 'POST /api/sms-webhook (httpSMS CloudEvents)',
        esp32: 'POST /api/esp32-sms-webhook (ESP32/SIM800L)',
        health: 'GET /api/webhook-health',
      },
      config: {
        httpsms_api_key: process.env.HTTPSMS_API_KEY ? '> configured' : '!!! missing',
        httpsms_owner_phone: process.env.HTTPSMS_OWNER_PHONE ? '> configured' : '!!! missing',
        webhook_signing_key: process.env.HTTPSMS_WEBHOOK_SIGNING_KEY ? '> configured' : '!!! not set (validation disabled)',
        openrouter_api_key: process.env.OPENROUTER_API_KEY
            ? '> configured'
            : '!!! missing',
      },
    });
  });

  console.log('SMS webhook routes configured:');
  console.log('- POST /api/sms-webhook (httpSMS CloudEvents format)');
  console.log('- POST /sms-webhook (httpSMS alias route)');
  console.log('- POST /api/esp32-sms-webhook (ESP32/SIM800L simple format)');
  console.log('- POST /esp32-sms-webhook (ESP32 alias route)');
  console.log('- GET /api/webhook-health (health check)');
}
