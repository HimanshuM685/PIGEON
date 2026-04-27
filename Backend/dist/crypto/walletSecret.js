"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
exports.encodeWalletSecret = encodeWalletSecret;
exports.decodeWalletSecret = decodeWalletSecret;
exports.encryptWalletSecret = encryptWalletSecret;
exports.decryptWalletSecret = decryptWalletSecret;
const mnemonic_1 = require("./mnemonic");
function bytesToHex(bytes) {
    return Buffer.from(bytes).toString("hex");
}
function hexToBytes(hex) {
    return new Uint8Array(Buffer.from(hex, "hex"));
}
function encodeWalletSecret(secret) {
    return JSON.stringify(secret);
}
function decodeWalletSecret(serialized) {
    const trimmed = serialized.trim();
    // Backward compatibility for legacy records where decrypted value is plain mnemonic.
    if (!trimmed.startsWith("{")) {
        return { version: 1, mnemonic: trimmed };
    }
    const parsed = JSON.parse(trimmed);
    if (parsed.version !== 2 ||
        typeof parsed.mnemonic !== "string" ||
        typeof parsed.falconPublicKeyHex !== "string" ||
        typeof parsed.falconSecretKeyHex !== "string") {
        throw new Error("Invalid wallet secret payload");
    }
    return {
        version: 2,
        mnemonic: parsed.mnemonic,
        falconPublicKeyHex: parsed.falconPublicKeyHex,
        falconSecretKeyHex: parsed.falconSecretKeyHex,
    };
}
function encryptWalletSecret(secret, password) {
    return (0, mnemonic_1.encryptMnemonic)(encodeWalletSecret(secret), password);
}
function decryptWalletSecret(encrypted, password) {
    const decrypted = (0, mnemonic_1.decryptMnemonic)(encrypted, password);
    return decodeWalletSecret(decrypted);
}
