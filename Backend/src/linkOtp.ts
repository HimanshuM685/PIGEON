/**
 * Cross-Platform Identity Linking via OTP
 *
 * Handles bidirectional linking between SMS phone numbers and Telegram accounts.
 *
 * Flow 1 (Telegram → SMS):
 *   User sends "link +919123456789" on Telegram
 *   → OTP sent to phone via SMSGate
 *   → User replies with OTP on Telegram
 *   → Accounts linked
 *
 * Flow 2 (SMS → Telegram):
 *   User sends "link @tghandle" via SMS
 *   → OTP sent to Telegram handle via bot
 *   → User replies with OTP via SMS
 *   → Accounts linked
 */

import { randomInt } from "crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PendingLink {
  otp: string;
  /** Channel that initiated the link request */
  sourceChannel: "sms" | "telegram";
  /** Identifier of the requester (phone number or Telegram user ID) */
  sourceIdentity: string;
  /** Identifier of the target to link to (@handle or phone number) */
  targetIdentity: string;
  /** When the OTP was generated */
  createdAt: number;
}

// ─── OTP Store ──────────────────────────────────────────────────────────────

/**
 * Maps: sourceIdentity → PendingLink
 * Key is the identity of whoever needs to reply with the OTP.
 */
const pendingLinks = new Map<string, PendingLink>();

/** OTPs expire after 5 minutes */
const OTP_TTL_MS = 5 * 60 * 1000;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP.
 */
export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Create a new link request and return the OTP.
 *
 * @param sourceChannel  - "sms" or "telegram"
 * @param sourceIdentity - phone (for SMS) or TG user ID (for Telegram)
 * @param targetIdentity - @handle (for TG target) or phone (for SMS target)
 * @returns The generated OTP string
 */
export function createLinkRequest(
  sourceChannel: "sms" | "telegram",
  sourceIdentity: string,
  targetIdentity: string
): string {
  const otp = generateOtp();

  pendingLinks.set(normalizeKey(sourceIdentity), {
    otp,
    sourceChannel,
    sourceIdentity,
    targetIdentity,
    createdAt: Date.now(),
  });

  console.log(
    `[LinkOTP] Created ${sourceChannel} → ${targetIdentity} link request for ${sourceIdentity} (OTP: ${otp})`
  );

  return otp;
}

/**
 * Verify an OTP for a pending link request.
 *
 * @param identity - The identity of the person submitting the OTP
 * @param otpAttempt - The OTP they submitted
 * @returns The PendingLink if valid, or null if invalid/expired
 */
export function verifyOtp(
  identity: string,
  otpAttempt: string
): PendingLink | null {
  const key = normalizeKey(identity);
  const pending = pendingLinks.get(key);

  if (!pending) {
    return null;
  }

  // Check expiry
  if (Date.now() - pending.createdAt > OTP_TTL_MS) {
    pendingLinks.delete(key);
    return null;
  }

  // Check OTP match
  if (pending.otp !== otpAttempt.trim()) {
    return null;
  }

  // Valid — remove from store
  pendingLinks.delete(key);
  console.log(`[LinkOTP] OTP verified for ${identity}`);
  return pending;
}

/**
 * Check if a given identity has a pending link request (for routing OTP replies).
 */
export function hasPendingLink(identity: string): boolean {
  const key = normalizeKey(identity);
  const pending = pendingLinks.get(key);
  if (!pending) return false;

  // Auto-expire
  if (Date.now() - pending.createdAt > OTP_TTL_MS) {
    pendingLinks.delete(key);
    return false;
  }

  return true;
}

/**
 * Cancel a pending link request.
 */
export function cancelLinkRequest(identity: string): void {
  pendingLinks.delete(normalizeKey(identity));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeKey(identity: string): string {
  return identity.replace(/\D/g, "").trim() || identity;
}
