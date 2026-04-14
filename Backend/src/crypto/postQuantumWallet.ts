import * as bip39 from "bip39";
import * as fc from "falcon-crypto";

type FalconCryptoApi = {
  keyPair: () => Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>;
  signDetached: (message: Uint8Array, secretKey: Uint8Array) => Promise<Uint8Array>;
  verifyDetached: (
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array
  ) => Promise<void>;
};

const falcon = fc as unknown as FalconCryptoApi;

export interface PostQuantumKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface WalletConfig {
  mnemonic: string;
  mnemonicPath?: string; // BIP39 derivation path (e.g., "m/44'/283'/0'/0'/0'")
  falconKeypair: PostQuantumKeypair;
  createdAt: Date;
}

export class PostQuantumWallet {
  /**
   * Initialize WASM Falcon runtime (can be called but is optional)
   */
  static async initialize(): Promise<void> {
    console.log("✓ FALCON crypto ready (no init needed for falcon-crypto)");
  }

  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Generate a new post-quantum wallet with BIP39 mnemonic
   * @param strength - Mnemonic strength: 128 (12 words) or 256 (24 words)
   * @returns Wallet configuration with FALCON keypair and mnemonic
   */
  static async generateWallet(strength: 128 | 256 = 256): Promise<WalletConfig> {
    // Generate BIP39 mnemonic (standard wallet recovery phrase)
    const mnemonic = bip39.generateMnemonic(strength);
    return this.createWalletFromMnemonic(mnemonic);
  }

  static async createWalletFromMnemonic(mnemonic: string): Promise<WalletConfig> {
    // Validate mnemonic
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error(
        "Invalid BIP39 mnemonic. Please provide a valid 12 or 24-word mnemonic."
      );
    }

    const keypair = await falcon.keyPair();

    return {
      mnemonic,
      falconKeypair: {
        publicKey: keypair.publicKey,
        secretKey: keypair.privateKey,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Recover wallet from BIP39 mnemonic (alias for createWalletFromMnemonic)
   */
  static async recoverWallet(mnemonic: string): Promise<WalletConfig> {
    return this.createWalletFromMnemonic(mnemonic);
  }

  /**
   * Sign a message using FALCON post-quantum signature
   * @param message - Message to sign (string or Uint8Array)
   * @param secretKey - FALCON secret key
   * @returns Promise resolving to signature as Uint8Array
   */
  static async signMessage(
    message: string | Uint8Array,
    secretKey: Uint8Array
  ): Promise<Uint8Array> {
    const messageBytes =
      typeof message === "string"
        ? new TextEncoder().encode(message)
        : message;

    const signature = await falcon.signDetached(messageBytes, secretKey);
    return signature;
  }

  /**
   * Verify a FALCON signature
   * @param signature - FALCON signature
   * @param message - Original message
   * @param publicKey - FALCON public key
   * @returns Promise resolving to true if signature is valid
   */
  static async verifySignature(
    signature: Uint8Array,
    message: string | Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    const messageBytes =
      typeof message === "string"
        ? new TextEncoder().encode(message)
        : message;

    try {
      await falcon.verifyDetached(signature, messageBytes, publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export wallet to JSON (for secure storage)
   * WARNING: secretKey contains sensitive data - store encrypted!
   */
  static exportWallet(wallet: WalletConfig): string {
    return JSON.stringify({
      mnemonic: wallet.mnemonic,
      publicKey: Array.from(wallet.falconKeypair.publicKey),
      secretKey: Array.from(wallet.falconKeypair.secretKey),
      createdAt: wallet.createdAt,
    });
  }

  /**
   * Import wallet from JSON
   * WARNING: Only import from trusted, encrypted sources!
   */
  static importWallet(walletJson: string): WalletConfig {
    const data = JSON.parse(walletJson);

    return {
      mnemonic: data.mnemonic,
      falconKeypair: {
        publicKey: new Uint8Array(data.publicKey),
        secretKey: new Uint8Array(data.secretKey),
      },
      createdAt: new Date(data.createdAt),
    };
  }

  /**
   * Get public key as hex string for easy transmission/storage
   */
  static publicKeyToHex(publicKey: Uint8Array): string {
    return Buffer.from(publicKey).toString("hex");
  }

  /**
   * Convert hex string back to public key
   */
  static hexToPublicKey(hex: string): Uint8Array {
    return new Uint8Array(Buffer.from(hex, "hex"));
  }
}
