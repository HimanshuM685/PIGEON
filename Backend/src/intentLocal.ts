/**
 * Local (regex-based) intent classifier for SMS wallet commands.
 *
 * This mirrors the pattern matching already used in the Telegram bot
 * (telegramBot.ts lines 49-57) and acts as the PRIMARY classifier.
 * OpenRouter AI is used as a fallback only for ambiguous messages.
 *
 * Zero external dependencies — works offline and is immune to rate limits.
 */

import type { IntentResult, IntentType, IntentParams } from './intent';

// ─── Command Patterns ───────────────────────────────────────────────────────
// Aligned with the Telegram bot patterns + SMS-specific variations

// Send: "send 5 algo to +919...", "send 30 ALGO to ABC123... password mypass"
const SEND_PATTERN =
  /^(?:send|transfer)\s+(\d+(?:\.\d+)?)\s*(?:algo)?\s*(?:to)\s+(\S+)(?:\s+(?:password|pass|pw|pin)\s+(.+))?$/i;

// Balance
const BALANCE_PATTERN =
  /^(?:balance|get\s+balance|bal|check\s+balance|how\s+much)$/i;

// Address
const ADDRESS_PATTERN =
  /^(?:address|get\s+address|addr|my\s+address|show\s+address|show\s+my\s+address)$/i;

// Fund
const FUND_PATTERN =
  /^(?:fund\s*me|fund|get\s+fund|fund\s+my\s+wallet)$/i;

// Transactions
const TXN_PATTERN =
  /^(?:get\s+txn|txn|transactions|history|last\s+transaction|txn\s+status|get\s+transactions)$/i;

// Create wallet / onboard (without mnemonic)
const CREATE_WALLET_PATTERN =
  /^(?:create\s+wallet|create\s+account|sign\s*up|onboard|register)(?:\s+(?:password|pass|pw|pin)\s+(.+))?$/i;

// Import wallet (with mnemonic)
const IMPORT_WALLET_PATTERN =
  /^import\s+wallet\s+(.+?)(?:\s+(?:password|pass|pw|pin)\s+(.+))?$/i;

// Get private key / recovery phrase
const PVT_KEY_PATTERN =
  /^(?:get\s+pvt\s+key|private\s+key|export\s+key|recovery\s+phrase|seed\s+phrase|mnemonic|get\s+private\s+key|show\s+private\s+key)(?:\s+(?:password|pass|pw|pin)\s+(.+))?$/i;

// ─── Classifier ─────────────────────────────────────────────────────────────

/**
 * Classify an SMS message locally using regex patterns.
 * Returns an IntentResult if a match is found, or null if the message
 * is ambiguous and should be sent to the AI fallback.
 */
export function getIntentLocal(message: string): IntentResult | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // ── Balance ─────────────────────────────────────────────────────────────
  if (BALANCE_PATTERN.test(lower)) {
    return {
      intent: 'get_balance',
      params: { asset: 'ALGO' },
      rawMessage: message,
    };
  }

  // ── Address ─────────────────────────────────────────────────────────────
  if (ADDRESS_PATTERN.test(lower)) {
    return {
      intent: 'get_address',
      params: {},
      rawMessage: message,
    };
  }

  // ── Fund ────────────────────────────────────────────────────────────────
  if (FUND_PATTERN.test(lower)) {
    return {
      intent: 'fund',
      params: {},
      rawMessage: message,
    };
  }

  // ── Transactions ────────────────────────────────────────────────────────
  if (TXN_PATTERN.test(lower)) {
    return {
      intent: 'get_txn',
      params: {},
      rawMessage: message,
    };
  }

  // ── Get Private Key ─────────────────────────────────────────────────────
  const pvtMatch = trimmed.match(PVT_KEY_PATTERN);
  if (pvtMatch) {
    const params: IntentParams = {};
    if (pvtMatch[1]) params.password = pvtMatch[1].trim();
    return {
      intent: 'get_pvt_key',
      params,
      rawMessage: message,
    };
  }

  // ── Import Wallet ───────────────────────────────────────────────────────
  const importMatch = trimmed.match(IMPORT_WALLET_PATTERN);
  if (importMatch) {
    const params: IntentParams = {
      mnemonic: importMatch[1].trim(),
    };
    if (importMatch[2]) params.password = importMatch[2].trim();
    return {
      intent: 'onboard',
      params,
      rawMessage: message,
    };
  }

  // ── Create Wallet ───────────────────────────────────────────────────────
  const createMatch = trimmed.match(CREATE_WALLET_PATTERN);
  if (createMatch) {
    const params: IntentParams = {};
    if (createMatch[1]) params.password = createMatch[1].trim();
    return {
      intent: 'onboard',
      params,
      rawMessage: message,
    };
  }

  // ── Send ────────────────────────────────────────────────────────────────
  const sendMatch = trimmed.match(SEND_PATTERN);
  if (sendMatch) {
    const params: IntentParams = {
      amount: sendMatch[1],
      asset: 'ALGO',
      to: sendMatch[2],
    };
    if (sendMatch[3]) params.password = sendMatch[3].trim();
    return {
      intent: 'send',
      params,
      rawMessage: message,
    };
  }

  // ── No match — return null so caller can try AI fallback ────────────────
  return null;
}
