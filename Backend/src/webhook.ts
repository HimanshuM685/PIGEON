import express from 'express';
import { getIntent, type IntentResult } from './intent';
import { sendAlgo } from './send';
import { getBalance } from './balance';
import { getAddress } from './address';
import { onboardUser } from './onboard';
import { fundUser } from './fund';
import { getTransactions } from './transactions';
import { createLinkRequest, verifyOtp, hasPendingLink } from './linkOtp';

// ─── SMSGate Webhook Payload Types ──────────────────────────────────────────

/**
 * SMSGate webhook envelope — wraps all events.
 * @see https://docs.sms-gate.app/getting-started/webhooks/
 */
export interface SmsGateWebhookEnvelope {
  deviceId: string;       // Device ID (e.g. "ffffffffceb0b1db0000018e937c815b")
  event: string;          // Event type (e.g. "sms:received")
  id: string;             // Unique event/message ID
  payload: SmsGateReceivedPayload;
  webhookId: string;      // Webhook registration ID
}

/**
 * Inner payload for sms:received events.
 */
export interface SmsGateReceivedPayload {
  messageId: string;      // Content-based ID
  message: string;        // SMS content text
  sender: string;         // Sender phone number
  recipient?: string;     // Device phone number (may be null)
  phoneNumber?: string;   // Deprecated — use sender
  simNumber?: number;     // SIM index (nullable)
  receivedAt: string;     // Local ISO 8601 timestamp
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ─── SMSGate Send API ───────────────────────────────────────────────────────

const SMSGATE_BASE_URL = (process.env.SMSGATE_BASE_URL || 'https://api.sms-gate.app').replace(/\/+$/, '');
const SMSGATE_SEND_URL = `${SMSGATE_BASE_URL}/3rdparty/v1/messages`;
const SMSGATE_MAX_CONTENT_LENGTH = 65535;

// ─── Concurrency Limiter (supports 3–5 simultaneous SMS sessions) ───────────

const MAX_CONCURRENT_SMS = 5;

class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => { this.running++; resolve(); });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }

  get activeCount(): number { return this.running; }
  get waitingCount(): number { return this.queue.length; }
}

const smsSemaphore = new Semaphore(MAX_CONCURRENT_SMS);

/**
 * Build the Basic Auth header value from SMSGate username + password.
 */
function getSmsGateAuthHeader(): string | null {
  const username = process.env.SMSGATE_USERNAME;
  const password = process.env.SMSGATE_PASSWORD;
  if (!username || !password) return null;
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Send an SMS reply through the SMSGate API.
 * Requires SMSGATE_USERNAME and SMSGATE_PASSWORD env vars.
 */
async function sendSmsViaSmsGate(to: string, content: string): Promise<{ success: boolean; error?: string }> {
  const authHeader = getSmsGateAuthHeader();

  if (!authHeader) {
    console.warn('SMSGate username or password not configured — skipping SMS reply');
    return { success: false, error: 'SMSGATE_USERNAME or SMSGATE_PASSWORD not set' };
  }

  try {
    const safeContent =
      content.length > SMSGATE_MAX_CONTENT_LENGTH
        ? `${content.slice(0, SMSGATE_MAX_CONTENT_LENGTH - 20)}\n...[truncated]`
        : content;

    const res = await fetch(SMSGATE_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        phoneNumbers: [to],
        message: safeContent,
        ...(process.env.SMSGATE_DEVICE_ID && { deviceId: process.env.SMSGATE_DEVICE_ID }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`SMSGate send failed (${res.status}):`, body);
      return { success: false, error: `SMSGate API ${res.status}: ${body}` };
    }

    const json = await res.json();
    console.log('SMSGate reply sent successfully:', json);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('SMSGate send error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Public export of sendSmsViaSmsGate for use by other modules
 * (e.g. telegramBot.ts needs to send OTPs via SMS).
 */
export { sendSmsViaSmsGate as sendSmsViaSmsGateExport };

// ─── Pending Sessions (two-step password flow) ─────────────────────────────

interface PendingSession {
  action: 'send' | 'onboard' | 'get_pvt_key' | 'link_otp_verify';
  /** Send params (only for 'send') */
  sendParams?: { amount: string; asset?: string; to: string };
  /** Optional: imported mnemonic for onboarding */
  onboardMnemonic?: string;
  /** Link target for OTP verification */
  linkTarget?: string;
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
    '• "link @tghandle" — link your Telegram account',
    '• "link +919XXXXXXXXX" — link another phone number',
  ].join('\n');
}

/**
 * Process an incoming SMS from SMSGate webhook, classify intent via OpenRouter,
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
    if (pending.action === 'link_otp_verify') {
      return await executeLinkOtpVerify(from, password, pending.linkTarget);
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

      case 'link': {
        const linkTarget = intentResult.params.linkTarget ?? '';
        if (!linkTarget) {
          return { reply: '!!! Missing target. Use: link @tghandle or link +919XXXXXXXXX', containedPassword: false };
        }

        if (linkTarget.startsWith('@')) {
          // SMS user wants to link their Telegram account
          // Generate OTP → send to Telegram → user verifies by replying OTP via SMS
          const handle = linkTarget.slice(1);
          const otp = createLinkRequest('sms', normPhone, handle);

          // Try to send OTP to the Telegram user
          const { sendTelegramOtp } = await import('./telegramBot');
          const sent = await sendTelegramOtp(handle, otp, from);
          if (!sent) {
            return {
              reply: `!!! Could not send OTP to ${linkTarget}. They must have interacted with the PIGEON bot first.`,
              containedPassword: false,
            };
          }

          // Set up pending session to await OTP reply
          pendingSessions.set(normPhone, {
            action: 'link_otp_verify',
            linkTarget: handle,
            createdAt: Date.now(),
          });

          return {
            reply: `OTP sent to ${linkTarget} on Telegram.\nReply with the 6-digit code to confirm linking:`,
            containedPassword: false,
          };
        }

        if (linkTarget.startsWith('+')) {
          // SMS user wants to link another phone number (less common, but supported)
          return {
            reply: '!!! Phone-to-phone linking is not supported via SMS. Use Telegram to link a phone number.',
            containedPassword: false,
          };
        }

        return { reply: '!!! Invalid link target. Use: link @tghandle', containedPassword: false };
      }

      case 'verify_otp': {
        // User sent a 6-digit OTP — check if there's a pending link for this phone
        const otpCode = intentResult.params.password ?? '';
        if (hasPendingLink(normPhone)) {
          return await executeLinkOtpVerify(from, otpCode);
        }
        // No pending link — treat as unknown (might be a password for something else)
        return { reply: `?? Could not understand your request.\n\n${getCommandMenuReply()}`, containedPassword: false };
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

async function executeLinkOtpVerify(
  from: string,
  otpAttempt: string,
  _linkTarget?: string
): Promise<SmsProcessResult> {
  const normPhone = normalizeSessionPhone(from);
  const result = verifyOtp(normPhone, otpAttempt);

  if (!result) {
    return {
      reply: '!!! Invalid or expired OTP. Please start the link process again with "link @tghandle".',
      containedPassword: false,
    };
  }

  // OTP verified — execute the link
  try {
    const { linkTelegramToPhone, findUserByTelegramId } = await import('./onchain');

    if (result.sourceChannel === 'sms') {
      // SMS user linking their Telegram: we need to find the TG user's ID from the handle
      // The Telegram bot should have stored the chat ID when sending the OTP
      const { getTelegramChatIdByHandle } = await import('./telegramBot');
      const tgChatId = getTelegramChatIdByHandle(result.targetIdentity);

      if (!tgChatId) {
        return {
          reply: `!!! Could not complete linking — @${result.targetIdentity} not found in bot records.`,
          containedPassword: false,
        };
      }

      await linkTelegramToPhone(tgChatId, from, result.targetIdentity);
      return {
        reply: `✅ Successfully linked your SMS account to Telegram @${result.targetIdentity}!`,
        containedPassword: false,
      };
    }

    if (result.sourceChannel === 'telegram') {
      // Telegram user linked a phone — this OTP came via SMS
      await linkTelegramToPhone(result.sourceIdentity, from, '');
      return {
        reply: `✅ Successfully linked your phone ${from} to your Telegram account!`,
        containedPassword: false,
      };
    }

    return { reply: '!!! Unknown link channel.', containedPassword: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      reply: `!!! Link failed: ${msg}`,
      containedPassword: false,
    };
  }
}

// ─── Webhook Auth (no-op for now) ───────────────────────────────────────────
// SMSGate sends webhooks directly from the device, it does NOT forward our
// Basic Auth credentials. If you need webhook auth, configure a signing_key
// via the SMSGate settings API. For now we accept all incoming webhooks.

// ─── Route Setup ────────────────────────────────────────────────────────────

/**
 * Mount SMSGate webhook routes on the Express app.
 */
export function setupWebhookRoutes(app: express.Express): void {

  // ── Dedup: track recently processed event IDs ───────────────────────────
  const processedEvents = new Set<string>();
  const DEDUP_TTL_MS = 5 * 60 * 1000; // keep IDs for 5 minutes

  const handleSmsGateWebhook = async (req: express.Request, res: express.Response) => {
    try {
      console.log(
        `[SMSGate] Webhook hit path=${req.path} content-type=${req.headers['content-type'] ?? 'unknown'}`
      );

      const body = req.body as Record<string, unknown>;

      // Log raw payload for debugging
      console.log('[SMSGate] Raw payload:', JSON.stringify(body, null, 2));

      let senderPhone = '';
      let smsContent = '';
      let eventId = '';

      // ── SMSGate webhook sends an envelope: { deviceId, event, id, payload: {...}, webhookId }
      const envelope = body as Partial<SmsGateWebhookEnvelope>;

      if (envelope.event && envelope.payload && typeof envelope.payload === 'object') {
        // Standard envelope format
        const p = envelope.payload;
        senderPhone = p.sender || p.phoneNumber || '';
        smsContent = p.message || '';
        eventId = envelope.id || p.messageId || '';

        if (envelope.event !== 'sms:received') {
          console.log(`[SMSGate] Ignoring non-sms:received event: ${envelope.event}`);
          return res.status(200).json({
            success: true,
            message: `Event ${envelope.event} acknowledged but not processed`,
          });
        }
      } else if (typeof body?.sender === 'string' && (typeof body?.message === 'string' || typeof body?.contentPreview === 'string')) {
        // Flat payload fallback (e.g. direct IncomingMessage without envelope)
        senderPhone = body.sender as string;
        smsContent = (body.message || body.contentPreview) as string;
        eventId = typeof body.id === 'string' ? body.id : (typeof body.messageId === 'string' ? body.messageId as string : '');
        console.warn('[SMSGate] Received flat payload (no envelope wrapper)');
      } else {
        console.error('[SMSGate] Unrecognized payload format:', JSON.stringify(body));
        return res.status(400).json({
          success: false,
          error: 'Invalid payload: expected SMSGate webhook envelope { deviceId, event, id, payload: { message, sender, ... } }',
        });
      }

      console.log(`[SMSGate] Event received: sms:received | id=${eventId || 'n/a'}`);

      // ── Deduplicate: skip if we already processed this event ID ─────────
      if (eventId && processedEvents.has(eventId)) {
        console.log(`[SMSGate] Duplicate event ignored: ${eventId}`);
        return res.status(200).json({
          success: true,
          message: `Duplicate event ${eventId} ignored`,
        });
      }
      if (eventId) {
        processedEvents.add(eventId);
        setTimeout(() => processedEvents.delete(eventId), DEDUP_TTL_MS);
      }

      if (!senderPhone || !smsContent) {
        return res.status(400).json({
          success: false,
          error: 'Missing sender or contentPreview in received event',
        });
      }

      console.log(`[SMSGate] Incoming SMS from ${senderPhone}: "${smsContent}"`);

      // --- SKIP MECHANISM ---
      // Automatically skip service/promotional SMS (alphanumeric sender IDs like "ADIGKS", "VK-SBI")
      // A standard phone number should only contain '+', digits, and possibly spaces/hyphens
      const isServiceSms = /[a-zA-Z]/.test(senderPhone);
      
      if (isServiceSms) {
        console.log(`[SMSGate] Skipping SMS from service sender: ${senderPhone}`);
        return res.status(200).json({
          success: true,
          message: `SMS from ${senderPhone} skipped`
        });
      }

      // ── Acquire semaphore slot (limits to MAX_CONCURRENT_SMS parallel sessions) ──
      console.log(`[SMSGate] Concurrency: ${smsSemaphore.activeCount}/${MAX_CONCURRENT_SMS} active, ${smsSemaphore.waitingCount} queued`);
      await smsSemaphore.acquire();

      try {
        // Process intent and generate reply
        const { reply: replyText, containedPassword } = await processIncomingSms(senderPhone, smsContent);
        console.log(`[SMSGate] Reply to ${senderPhone}: "${replyText}"`);

        // Send reply back via SMSGate API
        const sendResult = await sendSmsViaSmsGate(senderPhone, replyText);

        // If the user's SMS contained a password, send a follow-up security warning
        if (containedPassword) {
          const securityWarning = '## SECURITY WARNING: Your previous message contained your password in plain text. Please DELETE it from your message history immediately for your safety.';
          // Small delay so the warning arrives as a separate message after the main reply
          setTimeout(async () => {
            try {
              await sendSmsViaSmsGate(senderPhone, securityWarning);
              console.log(`[SMSGate] Security warning sent to ${senderPhone}`);
            } catch (err) {
              console.error('[SMSGate] Failed to send security warning:', err);
            }
          }, 2000);
        }

        res.status(200).json({
          success: true,
          message: 'SMS processed and reply sent',
          data: {
            from: senderPhone,
            intent_reply: replyText,
            sms_sent: sendResult.success,
            sms_send_error: sendResult.error,
            security_warning_queued: containedPassword,
          },
        });
      } finally {
        smsSemaphore.release();
      }

    } catch (error) {
      console.error('[SMSGate] Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  // ── SMSGate Webhook Endpoints (primary + alias) ─────────────────────────
  app.post('/api/sms-webhook', express.json({ type: '*/*' }), handleSmsGateWebhook);
  app.post('/sms-webhook', express.json({ type: '*/*' }), handleSmsGateWebhook);

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
        smsgate: 'POST /api/sms-webhook (SMSGate sms:received webhook)',
        esp32: 'POST /api/esp32-sms-webhook (ESP32/SIM800L)',
        health: 'GET /api/webhook-health',
      },
      config: {
        smsgate_base_url: SMSGATE_BASE_URL,
        smsgate_username: process.env.SMSGATE_USERNAME ? '> configured' : '!!! missing',
        smsgate_password: process.env.SMSGATE_PASSWORD ? '> configured' : '!!! missing',
        openrouter_api_key: process.env.OPENROUTER_API_KEY
            ? '> configured'
            : '!!! missing',
      },
      concurrency: {
        max_concurrent_sms: MAX_CONCURRENT_SMS,
        active: smsSemaphore.activeCount,
        queued: smsSemaphore.waitingCount,
      },
    });
  });

  console.log('SMS webhook routes configured:');
  console.log('- POST /api/sms-webhook (SMSGate sms:received webhook)');
  console.log('- POST /sms-webhook (SMSGate alias route)');
  console.log('- POST /api/esp32-sms-webhook (ESP32/SIM800L simple format)');
  console.log('- POST /esp32-sms-webhook (ESP32 alias route)');
  console.log('- GET /api/webhook-health (health check)');
}
