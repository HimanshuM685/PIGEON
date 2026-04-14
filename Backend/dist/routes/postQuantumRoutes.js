"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postQuantumWallet_1 = require("../crypto/postQuantumWallet");
const router = (0, express_1.Router)();
/**
 * POST /api/pq-wallet/generate
 * Generate a new post-quantum wallet with BIP39 mnemonic
 */
router.post("/generate", async (req, res) => {
    try {
        const strength = (req.body.strength || 256);
        const wallet = await postQuantumWallet_1.PostQuantumWallet.generateWallet(strength);
        res.json({
            success: true,
            data: {
                mnemonic: wallet.mnemonic,
                publicKey: postQuantumWallet_1.PostQuantumWallet.publicKeyToHex(wallet.falconKeypair.publicKey),
                createdAt: wallet.createdAt,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate wallet",
        });
    }
});
/**
 * POST /api/pq-wallet/recover
 * Recover wallet from BIP39 mnemonic
 */
router.post("/recover", async (req, res) => {
    try {
        const { mnemonic } = req.body;
        if (!mnemonic) {
            return res.status(400).json({
                success: false,
                error: "Mnemonic is required",
            });
        }
        const wallet = await postQuantumWallet_1.PostQuantumWallet.recoverWallet(mnemonic);
        res.json({
            success: true,
            data: {
                mnemonic: wallet.mnemonic,
                publicKey: postQuantumWallet_1.PostQuantumWallet.publicKeyToHex(wallet.falconKeypair.publicKey),
                createdAt: wallet.createdAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to recover wallet",
        });
    }
});
/**
 * POST /api/pq-wallet/sign
 * Sign a message with FALCON post-quantum signature
 */
router.post("/sign", async (req, res) => {
    try {
        const { message, secretKey } = req.body;
        if (!message || !secretKey) {
            return res.status(400).json({
                success: false,
                error: "Message and secretKey are required",
            });
        }
        const secretKeyBytes = postQuantumWallet_1.PostQuantumWallet.hexToPublicKey(secretKey);
        const signature = await postQuantumWallet_1.PostQuantumWallet.signMessage(message, secretKeyBytes);
        res.json({
            success: true,
            data: {
                signature: Buffer.from(signature).toString("hex"),
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to sign message",
        });
    }
});
/**
 * POST /api/pq-wallet/verify
 * Verify a FALCON signature
 */
router.post("/verify", async (req, res) => {
    try {
        const { signature, message, publicKey } = req.body;
        if (!signature || !message || !publicKey) {
            return res.status(400).json({
                success: false,
                error: "Signature, message, and publicKey are required",
            });
        }
        const signatureBytes = new Uint8Array(Buffer.from(signature, "hex").buffer);
        const publicKeyBytes = postQuantumWallet_1.PostQuantumWallet.hexToPublicKey(publicKey);
        const isValid = await postQuantumWallet_1.PostQuantumWallet.verifySignature(signatureBytes, message, publicKeyBytes);
        res.json({
            success: true,
            data: {
                valid: isValid,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to verify signature",
        });
    }
});
exports.default = router;
