import * as algosdk from "algosdk";
import { findOnboardedUser, insertOnboardedUser } from "./onchain";
import { PostQuantumWallet } from "./crypto/postQuantumWallet";
import { encryptMnemonic } from "./crypto/mnemonic";
import { bytesToHex } from "./crypto/walletSecret";

export interface OnboardResult {
  alreadyOnboarded: boolean;
  address?: string;
  falconPublicKey?: string;
  importedMnemonic?: boolean;
  error?: string;
}

/**
 * Onboard a user: create/import mnemonic, generate Falcon keys, derive Algorand address from mnemonic,
 * encrypt wallet secret with user password, store on-chain.
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
    const wallet = trimmedImportedMnemonic
      ? await PostQuantumWallet.createWalletFromMnemonic(trimmedImportedMnemonic)
      : await PostQuantumWallet.generateWallet(256);
    const account = algosdk.mnemonicToSecretKey(wallet.mnemonic);
    const addressStr = typeof account.addr === "string" ? account.addr : String(account.addr);
    const falconPublicKey = bytesToHex(wallet.falconKeypair.publicKey);
    const encrypted = encryptMnemonic(wallet.mnemonic, password);
    await insertOnboardedUser(phone, addressStr, encrypted);
    return {
      alreadyOnboarded: false,
      address: addressStr,
      falconPublicKey,
      importedMnemonic: Boolean(trimmedImportedMnemonic),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { alreadyOnboarded: false, error: `Onboard failed: ${message}` };
  }
}
