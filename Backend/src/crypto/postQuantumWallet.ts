import * as bip39 from "bip39";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execFileAsync = promisify(execFile);
const FALCON_LOGN = 9;
const FALCON_CLI_PATH = path.join(process.cwd(), "falcon-main", "pigeon_falcon_cli");

export interface PostQuantumKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface WalletConfig {
  mnemonic: string;
  mnemonicPath?: string;
  falconKeypair: PostQuantumKeypair;
  createdAt: Date;
}

export class PostQuantumWallet {
  private static async runFalconCli(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(FALCON_CLI_PATH, args, {
        maxBuffer: 1024 * 1024,
      });
      return stdout.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falcon CLI failed. Build it with \`npm run build:falcon-cli\`. Details: ${message}`
      );
    }
  }

  /**
   * Initialize Falcon runtime and verify native CLI availability
   */
  static async initialize(): Promise<void> {
    await this.runFalconCli(["keygen", String(FALCON_LOGN)]);
    console.log("✓ FALCON native CLI ready");
  }

  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  static async generateFalconKeypair(): Promise<PostQuantumKeypair> {
    const raw = await this.runFalconCli(["keygen", String(FALCON_LOGN)]);
    const parsed = JSON.parse(raw) as { publicKeyHex?: string; secretKeyHex?: string };

    if (!parsed.publicKeyHex || !parsed.secretKeyHex) {
      throw new Error("Invalid keygen response from Falcon CLI");
    }

    return {
      publicKey: this.hexToPublicKey(parsed.publicKeyHex),
      secretKey: new Uint8Array(Buffer.from(parsed.secretKeyHex, "hex")),
    };
  }

  /**
   * Generate wallet with standard BIP39 mnemonic and Falcon auth keys
   * @param strength - Mnemonic strength: 128 (12 words) or 256 (24 words)
   * @returns Wallet configuration with FALCON keypair and mnemonic
   */
  static async generateWallet(strength: 128 | 256 = 256): Promise<WalletConfig> {
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

    const keypair = await this.generateFalconKeypair();

    return {
      mnemonic,
      falconKeypair: {
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey,
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

    const raw = await this.runFalconCli([
      "sign",
      Buffer.from(secretKey).toString("hex"),
      Buffer.from(messageBytes).toString("hex"),
    ]);
    const parsed = JSON.parse(raw) as { signatureHex?: string };

    if (!parsed.signatureHex) {
      throw new Error("Invalid sign response from Falcon CLI");
    }

    return new Uint8Array(Buffer.from(parsed.signatureHex, "hex"));
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
      const raw = await this.runFalconCli([
        "verify",
        Buffer.from(publicKey).toString("hex"),
        Buffer.from(messageBytes).toString("hex"),
        Buffer.from(signature).toString("hex"),
      ]);
      const parsed = JSON.parse(raw) as { valid?: boolean };
      return Boolean(parsed.valid);
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
