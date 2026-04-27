"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostQuantumWallet = void 0;
const bip39 = __importStar(require("bip39"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const FALCON_LOGN = 9;
const FALCON_CLI_PATH = path.join(process.cwd(), "falcon-main", "pigeon_falcon_cli");
class PostQuantumWallet {
    static async runFalconCli(args) {
        try {
            const { stdout } = await execFileAsync(FALCON_CLI_PATH, args, {
                maxBuffer: 1024 * 1024,
            });
            return stdout.trim();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Falcon CLI failed. Build it with \`npm run build:falcon-cli\`. Details: ${message}`);
        }
    }
    /**
     * Initialize Falcon runtime and verify native CLI availability
     */
    static async initialize() {
        await this.runFalconCli(["keygen", String(FALCON_LOGN)]);
        console.log("✓ FALCON native CLI ready");
    }
    static validateMnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic);
    }
    static async generateFalconKeypair() {
        const raw = await this.runFalconCli(["keygen", String(FALCON_LOGN)]);
        const parsed = JSON.parse(raw);
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
    static async generateWallet(strength = 256) {
        const mnemonic = bip39.generateMnemonic(strength);
        return this.createWalletFromMnemonic(mnemonic);
    }
    static async createWalletFromMnemonic(mnemonic) {
        // Validate mnemonic
        if (!this.validateMnemonic(mnemonic)) {
            throw new Error("Invalid BIP39 mnemonic. Please provide a valid 12 or 24-word mnemonic.");
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
    static async recoverWallet(mnemonic) {
        return this.createWalletFromMnemonic(mnemonic);
    }
    /**
     * Sign a message using FALCON post-quantum signature
     * @param message - Message to sign (string or Uint8Array)
     * @param secretKey - FALCON secret key
     * @returns Promise resolving to signature as Uint8Array
     */
    static async signMessage(message, secretKey) {
        const messageBytes = typeof message === "string"
            ? new TextEncoder().encode(message)
            : message;
        const raw = await this.runFalconCli([
            "sign",
            Buffer.from(secretKey).toString("hex"),
            Buffer.from(messageBytes).toString("hex"),
        ]);
        const parsed = JSON.parse(raw);
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
    static async verifySignature(signature, message, publicKey) {
        const messageBytes = typeof message === "string"
            ? new TextEncoder().encode(message)
            : message;
        try {
            const raw = await this.runFalconCli([
                "verify",
                Buffer.from(publicKey).toString("hex"),
                Buffer.from(messageBytes).toString("hex"),
                Buffer.from(signature).toString("hex"),
            ]);
            const parsed = JSON.parse(raw);
            return Boolean(parsed.valid);
        }
        catch {
            return false;
        }
    }
    /**
     * Export wallet to JSON (for secure storage)
     * WARNING: secretKey contains sensitive data - store encrypted!
     */
    static exportWallet(wallet) {
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
    static importWallet(walletJson) {
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
    static publicKeyToHex(publicKey) {
        return Buffer.from(publicKey).toString("hex");
    }
    /**
     * Convert hex string back to public key
     */
    static hexToPublicKey(hex) {
        return new Uint8Array(Buffer.from(hex, "hex"));
    }
}
exports.PostQuantumWallet = PostQuantumWallet;
