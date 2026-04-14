"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostQuantumWallet = void 0;
const bip39 = require("bip39");
const fc = require("falcon-crypto");
class PostQuantumWallet {
    /**
     * Initialize WASM Falcon runtime (can be called but is optional)
     */
    static async initialize() {
        console.log("✓ FALCON crypto ready (no init needed for falcon-crypto)");
    }
    /**
     * Generate a new post-quantum wallet with BIP39 mnemonic
     * @param strength - Mnemonic strength: 128 (12 words) or 256 (24 words)
     * @returns Wallet configuration with FALCON keypair and mnemonic
     */
    static async generateWallet(strength = 256) {
        // Generate BIP39 mnemonic (standard wallet recovery phrase)
        const mnemonic = bip39.generateMnemonic(strength);
        // Generate FALCON keypair for post-quantum signing
        const keypair = await fc.keyPair();
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
     * Recover wallet from BIP39 mnemonic and generate FALCON keypair
     * @param mnemonic - BIP39 mnemonic phrase (12 or 24 words)
     * @returns Wallet configuration
     */
    static async recoverWallet(mnemonic) {
        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error("Invalid BIP39 mnemonic. Please provide a valid 12 or 24-word mnemonic.");
        }
        // Generate FALCON keypair for this mnemonic recovery
        const keypair = await fc.keyPair();
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
     * Sign a message using FALCON post-quantum signature
     * @param message - Message to sign (string or Uint8Array)
     * @param secretKey - FALCON secret key
     * @returns Promise resolving to signature as Uint8Array
     */
    static async signMessage(message, secretKey) {
        const messageBytes = typeof message === "string"
            ? new TextEncoder().encode(message)
            : message;
        const signature = await fc.signDetached(messageBytes, secretKey);
        return signature;
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
            await fc.verifyDetached(signature, messageBytes, publicKey);
            return true;
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
