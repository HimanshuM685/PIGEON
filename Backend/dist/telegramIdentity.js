"use strict";
/**
 * Telegram Identity Resolution Module
 *
 * Resolves recipient input from Telegram messages into valid Algorand destinations.
 *
 * Resolution rules:
 *   1. Starts with "+"  → phone number → lookup on-chain by phone → get address
 *   2. Starts with "@"  → Telegram username → lookup on-chain by handle → get address
 *   3. Otherwise        → validate as Algorand address → use directly
 */
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
exports.resolveTarget = resolveTarget;
exports.indexTelegramHandle = indexTelegramHandle;
exports.removeHandleIndex = removeHandleIndex;
const algosdk = __importStar(require("algosdk"));
const onchain_1 = require("./onchain");
// ─── Resolution ─────────────────────────────────────────────────────────────
/**
 * Resolve a recipient input string into an Algorand address.
 *
 * @param input  Raw target from user message: "+91...", "@username", or wallet address
 * @returns      Resolved target with address or error
 */
async function resolveTarget(input) {
    const trimmed = input.trim();
    if (!trimmed) {
        return { type: "wallet", raw: input, error: "Empty target" };
    }
    // ── Phone number: starts with "+" ──────────────────────────────────────
    if (trimmed.startsWith("+")) {
        return await resolvePhoneTarget(trimmed);
    }
    // ── Telegram username: starts with "@" ─────────────────────────────────
    if (trimmed.startsWith("@")) {
        return await resolveTelegramTarget(trimmed);
    }
    // ── Algorand address: validate directly ────────────────────────────────
    return resolveWalletTarget(trimmed);
}
/**
 * Resolve a phone number target.
 * Looks up on-chain records keyed by normalised phone.
 */
async function resolvePhoneTarget(phone) {
    // Validate phone format: must be + followed by digits, at least 10 digits total
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
        return {
            type: "phone",
            raw: phone,
            error: `Invalid phone number. Use format: +91XXXXXXXXXX`,
        };
    }
    try {
        const user = await (0, onchain_1.findOnboardedUser)(phone);
        if (user?.address) {
            return { type: "phone", raw: phone, resolvedAddress: user.address };
        }
        // Also try with just digits
        const userByDigits = await (0, onchain_1.findOnboardedUser)(digitsOnly);
        if (userByDigits?.address) {
            return { type: "phone", raw: phone, resolvedAddress: userByDigits.address };
        }
        return {
            type: "phone",
            raw: phone,
            error: `No wallet found for ${phone}. Recipient must be onboarded first.`,
        };
    }
    catch (err) {
        return {
            type: "phone",
            raw: phone,
            error: `Phone lookup failed: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
/**
 * Resolve a Telegram @username target.
 * Currently not implemented as on-chain handle search requires iteration.
 * Falls back to error with instructions.
 */
async function resolveTelegramTarget(handle) {
    const username = handle.startsWith("@") ? handle.slice(1) : handle;
    if (!username || username.length < 2) {
        return {
            type: "telegram",
            raw: handle,
            error: "Invalid Telegram username",
        };
    }
    // Note: On-chain handle search would require Box iteration, which Algorand
    // doesn't natively support. For now, we rely on the backend keeping an
    // in-memory index of handle → telegramId. This is populated as users interact
    // with the bot.
    const address = telegramHandleIndex.get(username.toLowerCase());
    if (address) {
        return { type: "telegram", raw: handle, resolvedAddress: address };
    }
    return {
        type: "telegram",
        raw: handle,
        error: `@${username} not found. They must interact with the bot first.`,
    };
}
/**
 * Resolve a raw wallet address target.
 */
function resolveWalletTarget(address) {
    if (algosdk.isValidAddress(address)) {
        return { type: "wallet", raw: address, resolvedAddress: address };
    }
    return {
        type: "wallet",
        raw: address,
        error: `Invalid target. Use +91XXXXXXXXXX, @username, or a valid Algorand wallet address.`,
    };
}
// ─── In-Memory Handle Index ─────────────────────────────────────────────────
//
// Since Algorand BoxMap does not support iteration/search by value,
// we maintain an in-memory cache mapping Telegram handles to addresses.
// This gets populated as users interact with the bot.
/** @username (lowercase, without @) → Algorand address */
const telegramHandleIndex = new Map();
/**
 * Register a Telegram handle → address mapping in the in-memory index.
 * Called when a user onboards or is first seen by the bot.
 */
function indexTelegramHandle(handle, address) {
    if (handle && address) {
        const normalised = handle.toLowerCase().replace(/^@/, "");
        telegramHandleIndex.set(normalised, address);
    }
}
/**
 * Remove a handle from the index.
 */
function removeHandleIndex(handle) {
    if (handle) {
        telegramHandleIndex.delete(handle.toLowerCase().replace(/^@/, ""));
    }
}
