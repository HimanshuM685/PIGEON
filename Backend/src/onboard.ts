import * as algosdk from "algosdk";
import { findOnboardedUser, insertOnboardedUser } from "./onchain";
import { encryptMnemonic } from "./crypto/mnemonic";

export interface OnboardResult {
  alreadyOnboarded: boolean;
  address?: string;
  error?: string;
}

/**
 * Onboard a user: create Algorand account (no KMD), encrypt mnemonic with user password, store on-chain.
 * Password is required and is never stored; it is only used to encrypt the mnemonic.
 */
export async function onboardUser(phone: string, password: string): Promise<OnboardResult> {
  console.log("onboardUser called with phone: ", phone);
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return { alreadyOnboarded: false, error: "Phone number (from) is required for onboarding" };
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    return { alreadyOnboarded: false, error: "Password is required for onboarding (used to encrypt your wallet)" };
  }

  const existing = await findOnboardedUser(phone);
  if (existing?.address && existing?.encrypted_mnemonic) {
    return {
      alreadyOnboarded: true,
      address: existing.address,
    };
  }
  if (existing?.address && !existing?.encrypted_mnemonic) {
    return {
      alreadyOnboarded: false,
      error: "Account exists from legacy flow; please contact support or use a new phone number",
    };
  }

  try {
    const { addr, sk } = algosdk.generateAccount();
    const addressStr = typeof addr === "string" ? addr : String(addr);
    const mnemonic = algosdk.secretKeyToMnemonic(sk);
    const encrypted = encryptMnemonic(mnemonic, password);
    await insertOnboardedUser(phone, addressStr, encrypted);
    return {
      alreadyOnboarded: false,
      address: addressStr,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { alreadyOnboarded: false, error: `Onboard failed: ${message}` };
  }
}
