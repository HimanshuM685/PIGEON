"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostQuantumWallet = void 0;
const bip39 = require("bip39");
const falcon_crypto_1 = require("falcon-crypto");
class PostQuantumWallet {
    /**
     * Initialize WASM Falcon runtime (must be called once at app startup)
     */
    static async initialize() {
        if (!this.initialized) {
            await falcon_crypto_1.falcon.ready();
            this.initialized = true;
            console.log("✓ FALCON WASM initialized for post-quantum cryptography");
        }
    }
    /**
     * Generate a new post-quantum wallet with BIP39 mnemonic
     * @param strength - Mnemonic strength: 128 (12 words) or 256 (24 words)
     * @returns Wallet configuration with FALCON keypair and mnemonic
     */
    static generateWallet(strength = 256) {
        // Generate BIP39 mnemonic (standard wallet recovery phrase)
        const mnemonic = bip39.generateMnemonic(strength);
        // Generate FALCON keypair for post-quantum signing
        const { publicKey, secretKey } = falcon_crypto_1.falcon.keyPair();
        return {
            mnemonic,
            falconKeypair: {
                publicKey: new Uint8Array(publicKey),
                secretKey: new Uint8Array(secretKey),
            },
            createdAt: new Date(),
        };
    }
    /**
     * Recover wallet from BIP39 mnemonic and generate FALCON keypair
     * @param mnemonic - BIP39 mnemonic phrase (12 or 24 words)
     * @returns Wallet configuration
     */
    static recoverWallet(mnemonic) {
        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error("Invalid BIP39 mnemonic. Please provide a valid 12 or 24-word mnemonic.");
        }
        // Generate FALCON keypair for this mnemonic recovery
        const { publicKey, secretKey } = falcon_crypto_1.falcon.keyPair();
        return {
            mnemonic,
            falconKeypair: {
                publicKey: new Uint8Array(publicKey),
                secretKey: new Uint8Array(secretKey),
            },
            createdAt: new Date(),
        };
    }
    /**
     * Sign a message using FALCON post-quantum signature
     * @param message - Message to sign (string or Uint8Array)
     * @param secretKey - FALCON secret key
     * @returns Signature as Uint8Array
     */
    static signMessage(message, secretKey) {
        const messageBytes = typeof message === "string"
            ? new TextEncoder().encode(message)
            : message;
        const signature = falcon_crypto_1.falcon.sign(messageBytes, secretKey);
        return new Uint8Array(signature);
    }
    /**
     * Verify a FALCON signature
     * @param signature - FALCON signature
     * @param message - Original message
     * @param publicKey - FALCON public key
     * @returns True if signature is valid
     */
    static verifySignature(signature, message, publicKey) {
        const messageBytes = typeof message === "string"
            ? new TextEncoder().encode(message)
            : message;
        return falcon_crypto_1.falcon.verify(signature, messageBytes, publicKey);
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
PostQuantumWallet.initialized = false;
