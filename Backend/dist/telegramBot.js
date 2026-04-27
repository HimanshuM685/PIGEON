"use strict";
/**
 * PIGEON Telegram Bot
 *
 * CLI-style execution interface inside Telegram.
 * Not a chatbot — an execution engine.
 *
 * Bridges: Telegram identities ↔ phone numbers ↔ Algorand wallets
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTelegramBot = startTelegramBot;
exports.stopTelegramBot = stopTelegramBot;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const onchain_1 = require("./onchain");
const telegramIdentity_1 = require("./telegramIdentity");
const send_1 = require("./send");
const balance_1 = require("./balance");
const address_1 = require("./address");
const fund_1 = require("./fund");
const transactions_1 = require("./transactions");
const walletSecret_1 = require("./crypto/walletSecret");
const postQuantumWallet_1 = require("./crypto/postQuantumWallet");
const mnemonic_1 = require("./crypto/mnemonic");
const crypto_1 = require("crypto");
const ed25519_1 = require("@noble/curves/ed25519");
const algosdk = __importStar(require("algosdk"));
/** Telegram user ID → pending session */
const pendingSessions = new Map();
/** Sessions expire after 5 minutes */
const SESSION_TTL_MS = 5 * 60 * 1000;
// ─── Command Patterns ───────────────────────────────────────────────────────
const SEND_PATTERN = /^(?:send|transfer)\s+(\d+(?:\.\d+)?)\s*(?:algo)?\s*(?:to)\s+(.+)$/i;
const CREATE_WALLET_PATTERN = /^create\s+wallet$/i;
const IMPORT_WALLET_PATTERN = /^import\s+wallet\s+(.+)$/i;
const BALANCE_PATTERN = /^(?:balance|get\s+balance|bal)$/i;
const ADDRESS_PATTERN = /^(?:address|get\s+address|addr|my\s+address)$/i;
const FUND_PATTERN = /^(?:fund\s*me|fund)$/i;
const TXN_PATTERN = /^(?:get\s+txn|txn|transactions|history)$/i;
const PVT_KEY_PATTERN = /^(?:get\s+pvt\s+key|private\s+key|export\s+key|recovery\s+phrase|seed\s+phrase|mnemonic)$/i;
const LINK_PHONE_PATTERN = /^link\s+phone\s+(\+\d{10,15})$/i;
// ─── Bot Factory ────────────────────────────────────────────────────────────
let botInstance = null;
/**
 * Initialize and start the Telegram bot in long-polling mode.
 * Returns the bot instance or null if token is not configured.
 */
function startTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — bot disabled");
        return null;
    }
    if (botInstance) {
        console.warn("[Telegram] Bot already running");
        return botInstance;
    }
    const bot = new node_telegram_bot_api_1.default(token, { polling: true });
    botInstance = bot;
    console.log("[Telegram] Bot starting in long-polling mode...");
    // ── Register handlers ─────────────────────────────────────────────────
    bot.on("message", (msg) => handleMessage(bot, msg));
    bot.on("polling_error", (err) => {
        console.error("[Telegram] Polling error:", err.message);
    });
    // Set bot commands menu
    bot.setMyCommands([
        { command: "start", description: "Show welcome message" },
        { command: "balance", description: "Check wallet balance" },
        { command: "address", description: "Get your wallet address" },
        { command: "create", description: "Create a new wallet" },
        { command: "fund", description: "Request testnet ALGO" },
        { command: "txn", description: "Show recent transactions" },
        { command: "help", description: "Show all commands" },
    ]).catch((err) => {
        console.warn("[Telegram] Failed to set commands menu:", err.message);
    });
    console.log("[Telegram] Bot initialized. Listening for messages...");
    return bot;
}
/**
 * Stop the Telegram bot.
 */
function stopTelegramBot() {
    if (botInstance) {
        botInstance.stopPolling();
        botInstance = null;
        console.log("[Telegram] Bot stopped");
    }
}
// ─── Message Handler ────────────────────────────────────────────────────────
async function handleMessage(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text?.trim();
    if (!userId || !text)
        return;
    try {
        // ── Check for pending session waiting for password ───────────────────
        const pending = pendingSessions.get(userId);
        if (pending) {
            // Check session expiry
            if (Date.now() - pending.createdAt > SESSION_TTL_MS) {
                pendingSessions.delete(userId);
                await reply(bot, chatId, "⚠️ Session expired. Please start your command again.");
                return;
            }
            // If awaiting send confirmation
            if (pending.awaitingConfirmation) {
                const normalised = text.toLowerCase();
                if (normalised === "yes" || normalised === "y" || normalised === "confirm") {
                    pending.awaitingConfirmation = false;
                    pending.createdAt = Date.now(); // refresh TTL
                    await reply(bot, chatId, "🔐 Reply with your password to execute:");
                    return;
                }
                else {
                    pendingSessions.delete(userId);
                    await reply(bot, chatId, "❌ Transaction cancelled.");
                    return;
                }
            }
            // If awaiting phone number
            if (pending.action === "onboard_phone") {
                let phone = "";
                if (msg.contact && msg.contact.phone_number) {
                    phone = msg.contact.phone_number;
                }
                else if (text && text.startsWith("+")) {
                    phone = text;
                }
                else if (text && text.toLowerCase() === "skip") {
                    phone = `tg_${userId}`;
                }
                else {
                    await reply(bot, chatId, "Please use the '📱 Share Contact' button, reply with your phone number starting with '+', or type 'skip'.");
                    return;
                }
                pending.action = "onboard_password";
                pending.onboardPhone = phone;
                pending.createdAt = Date.now();
                await bot.sendMessage(chatId, "🔐 *Create Wallet*\n\nChoose a password and reply with it.\n⚠️ Remember it — it cannot be recovered!", {
                    parse_mode: "Markdown",
                    reply_markup: { remove_keyboard: true }
                });
                return;
            }
            // Otherwise, this message IS the password
            pendingSessions.delete(userId);
            const password = text;
            // Try to delete the password message
            try {
                await bot.deleteMessage(chatId, msg.message_id);
            }
            catch {
                // Can't delete in private chats without admin rights — that's fine
            }
            // Execute the pending action
            if (pending.action === "onboard_password") {
                await executeOnboard(bot, chatId, userId, password, msg.from?.username, pending.onboardMnemonic, pending.onboardPhone);
            }
            else if (pending.action === "send" && pending.sendParams) {
                await executeSend(bot, chatId, userId, password, pending.sendParams);
            }
            else if (pending.action === "get_pvt_key") {
                await executeGetPvtKey(bot, chatId, userId, password);
            }
            // Security warning
            await reply(bot, chatId, "⚠️ Delete your previous message (password exposed)");
            return;
        }
        // ── Route commands ──────────────────────────────────────────────────
        const normalised = text.toLowerCase();
        // /start or help
        if (normalised === "/start" || normalised === "/help" || normalised === "help" || normalised === "start") {
            await sendWelcome(bot, chatId);
            return;
        }
        // Balance
        if (BALANCE_PATTERN.test(normalised) || normalised === "/balance") {
            await handleBalance(bot, chatId, userId);
            return;
        }
        // Address
        if (ADDRESS_PATTERN.test(normalised) || normalised === "/address") {
            await handleAddress(bot, chatId, userId);
            return;
        }
        // Fund
        if (FUND_PATTERN.test(normalised) || normalised === "/fund") {
            await handleFund(bot, chatId, userId);
            return;
        }
        // Transactions
        if (TXN_PATTERN.test(normalised) || normalised === "/txn") {
            await handleTransactions(bot, chatId, userId);
            return;
        }
        // Create wallet
        if (CREATE_WALLET_PATTERN.test(normalised) || normalised === "/create") {
            await handleCreateWallet(bot, chatId, userId);
            return;
        }
        // Import wallet
        const importMatch = text.match(IMPORT_WALLET_PATTERN);
        if (importMatch) {
            await handleImportWallet(bot, chatId, userId, importMatch[1].trim());
            return;
        }
        // Send / Transfer
        const sendMatch = text.match(SEND_PATTERN);
        if (sendMatch) {
            await handleSend(bot, chatId, userId, sendMatch[1], sendMatch[2].trim());
            return;
        }
        // Get private key
        if (PVT_KEY_PATTERN.test(normalised)) {
            await handleGetPvtKey(bot, chatId, userId);
            return;
        }
        // Link phone
        const linkMatch = text.match(LINK_PHONE_PATTERN);
        if (linkMatch) {
            await handleLinkPhone(bot, chatId, userId, linkMatch[1], msg.from?.username);
            return;
        }
        // Unknown command
        await reply(bot, chatId, `❌ Unknown command.\n\nType /help for available commands.`);
    }
    catch (err) {
        console.error("[Telegram] Message handler error:", err);
        await reply(bot, chatId, `❌ Internal error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
}
// ─── Command Handlers ───────────────────────────────────────────────────────
async function sendWelcome(bot, chatId) {
    const menu = [
        "🕊️ *PIGEON Wallet*",
        "",
        "Commands:",
        "• `create wallet` — create new wallet",
        "• `import wallet <mnemonic>` — import existing",
        "• `balance` — check balance",
        "• `address` — get wallet address",
        "• `send <amount> algo to <target>` — send ALGO",
        "• `fund me` — request testnet ALGO",
        "• `get txn` — recent transactions",
        "• `get pvt key` — export recovery phrase",
        "• `link phone +91XXXXXXXXXX` — link phone number",
        "",
        "Targets: `@username`, `+phone`, or wallet address",
    ].join("\n");
    await reply(bot, chatId, menu, true);
}
async function handleBalance(bot, chatId, userId) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
        return;
    }
    const result = await (0, balance_1.getBalance)(user.phone, {});
    if (result.success) {
        await reply(bot, chatId, `💰 Balance: ${result.balance} ALGO`);
    }
    else {
        await reply(bot, chatId, `❌ ${result.error}`);
    }
}
async function handleAddress(bot, chatId, userId) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
        return;
    }
    const result = await (0, address_1.getAddress)(user.phone);
    if (result.success) {
        await reply(bot, chatId, `📱 Your address:\n\`${result.address}\``);
    }
    else {
        await reply(bot, chatId, `❌ ${result.error}`);
    }
}
async function handleFund(bot, chatId, userId) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
        return;
    }
    const result = await (0, fund_1.fundUser)(user.phone);
    if (result.success) {
        await reply(bot, chatId, `✅ Funded 1 ALGO\n💰 ${result.explorerUrl}`);
    }
    else {
        await reply(bot, chatId, `❌ ${result.error}`);
    }
}
async function handleTransactions(bot, chatId, userId) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
        return;
    }
    const result = await (0, transactions_1.getTransactions)(user.phone, 5);
    if (result.success && result.transactions?.length) {
        const lines = result.transactions.map((tx, i) => {
            const dir = tx.sender === result.address ? "⬆️ Sent" : "⬇️ Received";
            const amt = tx.amount ? `${tx.amount} ALGO` : tx.type;
            const date = tx.roundTime.slice(0, 10);
            return `${i + 1}. ${dir} ${amt} (${date})\n   [View](${tx.explorerUrl})`;
        });
        await reply(bot, chatId, `📋 Last ${result.transactions.length} transactions:\n\n${lines.join("\n\n")}`, true);
    }
    else if (result.success) {
        await reply(bot, chatId, "📋 No transactions found.");
    }
    else {
        await reply(bot, chatId, `❌ ${result.error}`);
    }
}
async function handleCreateWallet(bot, chatId, userId) {
    // Check if already onboarded
    const existing = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (existing?.address) {
        await reply(bot, chatId, `📱 Already onboarded.\nAddress: \`${existing.address}\``, true);
        return;
    }
    // Ask for phone number first
    pendingSessions.set(userId, {
        action: "onboard_phone",
        createdAt: Date.now(),
    });
    await bot.sendMessage(chatId, "📱 *Link Phone Number*\n\nShare your phone number to access your wallet via SMS later, or type `skip` for a Telegram-only wallet.", {
        parse_mode: "Markdown",
        reply_markup: {
            keyboard: [[{ text: "📱 Share Contact", request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
        }
    });
}
async function handleImportWallet(bot, chatId, userId, mnemonic) {
    const existing = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (existing?.address) {
        await reply(bot, chatId, `📱 Already onboarded.\nAddress: \`${existing.address}\``, true);
        return;
    }
    // Try to delete the message containing the mnemonic
    try {
        // Note: Can't delete in private chats without admin rights
    }
    catch { }
    pendingSessions.set(userId, {
        action: "onboard_phone",
        onboardMnemonic: mnemonic,
        createdAt: Date.now(),
    });
    await bot.sendMessage(chatId, "📱 *Link Phone Number*\n\nShare your phone number to access your imported wallet via SMS later, or type `skip` for a Telegram-only wallet.", {
        parse_mode: "Markdown",
        reply_markup: {
            keyboard: [[{ text: "📱 Share Contact", request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
        }
    });
}
async function handleSend(bot, chatId, userId, amountStr, target) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
        return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        await reply(bot, chatId, "❌ Invalid amount.");
        return;
    }
    // Resolve target
    const resolved = await (0, telegramIdentity_1.resolveTarget)(target);
    if (resolved.error || !resolved.resolvedAddress) {
        await reply(bot, chatId, `❌ ${resolved.error}`);
        return;
    }
    // Store pending and ask for confirmation
    pendingSessions.set(userId, {
        action: "send",
        sendParams: {
            amount: amountStr,
            to: target,
            resolvedAddress: resolved.resolvedAddress,
        },
        awaitingConfirmation: true,
        createdAt: Date.now(),
    });
    const displayTarget = resolved.type === "wallet"
        ? `\`${resolved.resolvedAddress.slice(0, 8)}...${resolved.resolvedAddress.slice(-6)}\``
        : target;
    await reply(bot, chatId, [
        `💰 *Send ${amountStr} ALGO to ${displayTarget}*`,
        "",
        `Resolved: \`${resolved.resolvedAddress}\``,
        "",
        "Reply `yes` to confirm or `no` to cancel:",
    ].join("\n"), true);
}
async function handleGetPvtKey(bot, chatId, userId) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
        return;
    }
    pendingSessions.set(userId, {
        action: "get_pvt_key",
        createdAt: Date.now(),
    });
    await reply(bot, chatId, "⚠️ Sensitive action\n🔐 Reply with your password:");
}
async function handleLinkPhone(bot, chatId, userId, phone, username) {
    try {
        await (0, onchain_1.linkTelegramToPhone)(userId.toString(), phone, username ?? "");
        await reply(bot, chatId, `✅ Phone ${phone} linked to your Telegram account.`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already linked")) {
            await reply(bot, chatId, "❌ This Telegram account is already linked to a phone number.");
        }
        else if (msg.includes("not found")) {
            await reply(bot, chatId, "❌ Phone number not onboarded via SMS. Onboard via SMS first, then link.");
        }
        else {
            await reply(bot, chatId, `❌ Link failed: ${msg}`);
        }
    }
}
// ─── Action Executors (step 2 — after password) ─────────────────────────────
async function executeOnboard(bot, chatId, userId, password, username, importedMnemonic, onboardPhone) {
    try {
        let addressStr = "";
        // If user provided a real phone number
        if (onboardPhone && onboardPhone !== `tg_${userId}`) {
            const { onboardUser } = await Promise.resolve().then(() => __importStar(require("./onboard")));
            const phone = onboardPhone.startsWith("+") ? onboardPhone : `+${onboardPhone}`;
            const onboardResult = await onboardUser(phone, password, importedMnemonic);
            if (onboardResult.error && !onboardResult.alreadyOnboarded) {
                await reply(bot, chatId, `❌ Onboard failed: ${onboardResult.error}`);
                return;
            }
            addressStr = onboardResult.address ?? "";
            // Link Telegram ID to this phone
            try {
                await (0, onchain_1.linkTelegramToPhone)(userId.toString(), phone, username ?? "");
            }
            catch (linkErr) {
                console.warn("Link telegram to phone warning:", linkErr);
            }
        }
        else {
            // Telegram-only onboard
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
            addressStr = algosdk.encodeAddress(algorandPublicKey);
            const mnemonic = algosdk.secretKeyToMnemonic(new Uint8Array(algorandSecretKey));
            const encrypted = (0, mnemonic_1.encryptMnemonic)(mnemonic, password);
            await (0, onchain_1.insertTelegramUser)(userId.toString(), addressStr, encrypted, username ?? "");
        }
        // Index the handle for @username resolution
        if (username) {
            (0, telegramIdentity_1.indexTelegramHandle)(username, addressStr);
        }
        await reply(bot, chatId, [
            "✅ Wallet created!",
            "",
            `📱 Address: \`${addressStr}\``,
            "",
            "Use `fund me` to get testnet ALGO.",
        ].join("\n"), true);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already onboarded")) {
            await reply(bot, chatId, "📱 You are already onboarded!");
        }
        else {
            await reply(bot, chatId, `❌ Onboard failed: ${msg}`);
        }
    }
}
async function executeSend(bot, chatId, userId, password, params) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.phone) {
        await reply(bot, chatId, "❌ Account not found.");
        return;
    }
    const sendResult = await (0, send_1.sendAlgo)(user.phone, password, {
        amount: params.amount,
        asset: params.asset,
        to: params.resolvedAddress,
    });
    if (sendResult.success) {
        const explorerUrl = sendResult.txId
            ? `https://testnet.explorer.perawallet.app/tx/${sendResult.txId}`
            : "";
        await reply(bot, chatId, [
            `✅ Sent ${params.amount} ALGO to ${params.to}`,
            explorerUrl ? `💰 [View on Explorer](${explorerUrl})` : "",
        ].filter(Boolean).join("\n"), true);
    }
    else {
        await reply(bot, chatId, `❌ Send failed: ${sendResult.error}`);
    }
}
async function executeGetPvtKey(bot, chatId, userId, password) {
    const user = await (0, onchain_1.findUserByTelegramId)(userId.toString());
    if (!user?.encrypted_mnemonic || !user?.address) {
        await reply(bot, chatId, "❌ Account not found or not onboarded.");
        return;
    }
    try {
        const secret = (0, walletSecret_1.decryptWalletSecret)(user.encrypted_mnemonic, password);
        await reply(bot, chatId, [
            "🔑 Your recovery phrase:",
            "",
            `\`${secret.mnemonic}\``,
            "",
            "⚠️ NEVER share this with anyone!",
            "⚠️ Delete this message immediately after saving.",
        ].join("\n"), true);
    }
    catch {
        await reply(bot, chatId, "❌ Wrong password.");
    }
}
// ─── Utilities ──────────────────────────────────────────────────────────────
async function reply(bot, chatId, text, markdown = false) {
    try {
        await bot.sendMessage(chatId, text, {
            parse_mode: markdown ? "Markdown" : undefined,
            disable_web_page_preview: true,
        });
    }
    catch (err) {
        // If markdown parsing fails, retry without markdown
        if (markdown) {
            try {
                await bot.sendMessage(chatId, text, {
                    disable_web_page_preview: true,
                });
            }
            catch (retryErr) {
                console.error("[Telegram] Failed to send message even without markdown:", retryErr);
            }
        }
        else {
            console.error("[Telegram] Failed to send message:", err);
        }
    }
}
