import { decryptMnemonic, encryptMnemonic } from "./mnemonic";

export interface WalletSecretV2 {
  version: 2;
  mnemonic: string;
  falconPublicKeyHex: string;
  falconSecretKeyHex: string;
}

export interface WalletSecretV1 {
  version: 1;
  mnemonic: string;
}

export type WalletSecret = WalletSecretV1 | WalletSecretV2;

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export function encodeWalletSecret(secret: WalletSecretV2): string {
  return JSON.stringify(secret);
}

export function decodeWalletSecret(serialized: string): WalletSecret {
  const trimmed = serialized.trim();

  // Backward compatibility for legacy records where decrypted value is plain mnemonic.
  if (!trimmed.startsWith("{")) {
    return { version: 1, mnemonic: trimmed };
  }

  const parsed = JSON.parse(trimmed) as Partial<WalletSecretV2>;
  if (
    parsed.version !== 2 ||
    typeof parsed.mnemonic !== "string" ||
    typeof parsed.falconPublicKeyHex !== "string" ||
    typeof parsed.falconSecretKeyHex !== "string"
  ) {
    throw new Error("Invalid wallet secret payload");
  }

  return {
    version: 2,
    mnemonic: parsed.mnemonic,
    falconPublicKeyHex: parsed.falconPublicKeyHex,
    falconSecretKeyHex: parsed.falconSecretKeyHex,
  };
}

export function encryptWalletSecret(secret: WalletSecretV2, password: string): string {
  return encryptMnemonic(encodeWalletSecret(secret), password);
}

export function decryptWalletSecret(encrypted: string, password: string): WalletSecret {
  const decrypted = decryptMnemonic(encrypted, password);
  return decodeWalletSecret(decrypted);
}
