"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptMnemonic = encryptMnemonic;
exports.decryptMnemonic = decryptMnemonic;
const crypto_1 = require("crypto");
const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const ALGO = "aes-256-gcm";
/**
 * Encrypt a plaintext (e.g. mnemonic) with a user password.
 * Returns a single base64 string: salt:iv:authTag:ciphertext (so we can decrypt with just password).
 */
function encryptMnemonic(plaintext, password) {
    const salt = (0, crypto_1.randomBytes)(SALT_LEN);
    const iv = (0, crypto_1.randomBytes)(IV_LEN);
    const key = (0, crypto_1.pbkdf2Sync)(password, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha256");
    const cipher = (0, crypto_1.createCipheriv)(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [salt, iv, authTag, enc].map((b) => b.toString("base64")).join(":");
}
/**
 * Decrypt payload produced by encryptMnemonic. Throws if password is wrong or payload invalid.
 */
function decryptMnemonic(encrypted, password) {
    const parts = encrypted.split(":");
    if (parts.length !== 4)
        throw new Error("Invalid encrypted mnemonic format");
    const [saltB64, ivB64, authTagB64, cipherB64] = parts;
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(cipherB64, "base64");
    const key = (0, crypto_1.pbkdf2Sync)(password, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha256");
    const decipher = (0, crypto_1.createDecipheriv)(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final().toString("utf8");
}
