import { findOnboardedUser, insertOnboardedUser } from "./onchain";
import { PostQuantumWallet } from "./crypto/postQuantumWallet";
import { bytesToHex } from "./crypto/walletSecret";
import { encryptMnemonic } from "./crypto/mnemonic";
import { createHash } from "crypto";
import { ed25519 } from "@noble/curves/ed25519";
import * as algosdk from "algosdk";

export interface OnboardResult {
  alreadyOnboarded: boolean;
  address?: string;
  falconPublicKey?: string;
  importedMnemonic?: boolean;
  error?: string;
}

/**
 * Onboard a user:
 * - generate Falcon keypair + BIP39 mnemonic
 * - derive a compact pq: address fingerprint from Falcon public key
 * Wallet secret is encrypted with user password and stored on-chain.
 * Password is required and is never stored; it is only used to encrypt the mnemonic.
 */
export async function onboardUser(
  phone: string,
  password: string,
  _importedMnemonic?: string
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
    const falconKeypair = await PostQuantumWallet.generateFalconKeypair();

    const algorandSeed = createHash("sha512")
      .update(Buffer.from(falconKeypair.secretKey))
      .update(Buffer.from(falconKeypair.publicKey))
      .digest()
      .subarray(0, 32);

    const algorandPublicKey = ed25519.getPublicKey(algorandSeed);
    const algorandSecretKey = Buffer.concat([
      Buffer.from(algorandSeed),
      Buffer.from(algorandPublicKey),
    ]);

    const addressStr = algosdk.encodeAddress(algorandPublicKey);
    const mnemonic = algosdk.secretKeyToMnemonic(new Uint8Array(algorandSecretKey));

    const falconPublicKey = bytesToHex(falconKeypair.publicKey);

    const encrypted = encryptMnemonic(mnemonic, password);

    await insertOnboardedUser(phone, addressStr, encrypted);
    return {
      alreadyOnboarded: false,
      address: addressStr,
      falconPublicKey,
      importedMnemonic: false,
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
