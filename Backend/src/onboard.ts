import * as algosdk from "algosdk";
import { findOnboardedUser, insertOnboardedUser } from "./onchain";
import { PostQuantumWallet } from "./crypto/postQuantumWallet";
import { bytesToHex } from "./crypto/walletSecret";
import { encryptMnemonic } from "./crypto/mnemonic";

export interface OnboardResult {
  alreadyOnboarded: boolean;
  address?: string;
  falconPublicKey?: string;
  importedMnemonic?: boolean;
  error?: string;
}

/**
 * Onboard a user:
 * - default path: generate standard Algorand account + BIP39 mnemonic (wallet usability/recovery)
 * - always generate Falcon keypair for post-quantum authentication/signing
 * - import path: accept existing Algorand mnemonic
 * Wallet secret is encrypted with user password and stored on-chain.
 * Password is required and is never stored; it is only used to encrypt the mnemonic.
 */
export async function onboardUser(
  phone: string,
  password: string,
  importedMnemonic?: string
): Promise<OnboardResult> {
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
    const trimmedImportedMnemonic = importedMnemonic?.trim();
    const account = trimmedImportedMnemonic
      ? algosdk.mnemonicToSecretKey(trimmedImportedMnemonic)
      : algosdk.generateAccount();

    const mnemonic = trimmedImportedMnemonic
      ? trimmedImportedMnemonic
      : algosdk.secretKeyToMnemonic(account.sk);

    const falconKeypair = await PostQuantumWallet.generateFalconKeypair();
    const falconPublicKey = bytesToHex(falconKeypair.publicKey);
    const addressStr = typeof account.addr === "string" ? account.addr : String(account.addr);

    const encrypted = encryptMnemonic(mnemonic, password);

    await insertOnboardedUser(phone, addressStr, encrypted);
    return {
      alreadyOnboarded: false,
      address: addressStr,
      falconPublicKey,
      importedMnemonic: Boolean(trimmedImportedMnemonic),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("tx.ApplicationArgs total length is too long")) {
      return {
        alreadyOnboarded: false,
        error: "Onboard failed: payload too large for on-chain call. Please try again.",
      };
    }

    return {
      alreadyOnboarded: false,
      error: `Onboard failed: ${message}`,
    };
  }
}
