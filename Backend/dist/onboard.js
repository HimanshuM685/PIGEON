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
exports.onboardUser = onboardUser;
const onchain_1 = require("./onchain");
const postQuantumWallet_1 = require("./crypto/postQuantumWallet");
const walletSecret_1 = require("./crypto/walletSecret");
const mnemonic_1 = require("./crypto/mnemonic");
const crypto_1 = require("crypto");
const ed25519_1 = require("@noble/curves/ed25519");
const algosdk = __importStar(require("algosdk"));
/**
 * Onboard a user:
 * - generate Falcon keypair + BIP39 mnemonic
 * - derive a compact pq: address fingerprint from Falcon public key
 * Wallet secret is encrypted with user password and stored on-chain.
 * Password is required and is never stored; it is only used to encrypt the mnemonic.
 */
async function onboardUser(phone, password, _importedMnemonic) {
    console.log("onboardUser called with phone: ", phone);
    if (!phone || typeof phone !== "string" || !phone.trim()) {
        return { alreadyOnboarded: false, error: "Phone number (from) is required for onboarding" };
    }
    if (!password || typeof password !== "string" || !password.trim()) {
        return { alreadyOnboarded: false, error: "Password is required for onboarding (used to encrypt your wallet)" };
    }
    const existing = await (0, onchain_1.findOnboardedUser)(phone);
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
        const falconKeypair = await postQuantumWallet_1.PostQuantumWallet.generateFalconKeypair();
        const algorandSeed = (0, crypto_1.createHash)("sha512")
            .update(Buffer.from(falconKeypair.secretKey))
            .update(Buffer.from(falconKeypair.publicKey))
            .digest()
            .subarray(0, 32);
        const algorandPublicKey = ed25519_1.ed25519.getPublicKey(algorandSeed);
        const algorandSecretKey = Buffer.concat([
            Buffer.from(algorandSeed),
            Buffer.from(algorandPublicKey),
        ]);
        const addressStr = algosdk.encodeAddress(algorandPublicKey);
        const mnemonic = algosdk.secretKeyToMnemonic(new Uint8Array(algorandSecretKey));
        const falconPublicKey = (0, walletSecret_1.bytesToHex)(falconKeypair.publicKey);
        const encrypted = (0, mnemonic_1.encryptMnemonic)(mnemonic, password);
        await (0, onchain_1.insertOnboardedUser)(phone, addressStr, encrypted);
        return {
            alreadyOnboarded: false,
            address: addressStr,
            falconPublicKey,
            importedMnemonic: false,
        };
    }
    catch (err) {
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
