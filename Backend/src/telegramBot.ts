/**
 * PIGEON Telegram Bot
 *
 * CLI-style execution interface inside Telegram.
 * Not a chatbot — an execution engine.
 *
 * Bridges: Telegram identities ↔ phone numbers ↔ Algorand wallets
 */

import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, insertTelegramUser, linkTelegramToPhone } from "./onchain";
import { resolveTarget, indexTelegramHandle } from "./telegramIdentity";
import { sendAlgo } from "./send";
import { getBalance } from "./balance";
import { getAddress } from "./address";
import { fundUser } from "./fund";
import { getTransactions } from "./transactions";
import { decryptWalletSecret } from "./crypto/walletSecret";
import { PostQuantumWallet } from "./crypto/postQuantumWallet";
import { bytesToHex } from "./crypto/walletSecret";
import { encryptMnemonic } from "./crypto/mnemonic";
import { createHash } from "crypto";
import { ed25519 } from "@noble/curves/ed25519";
import * as algosdk from "algosdk";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PendingSession {
  action: "send" | "onboard" | "get_pvt_key";
  /** Send params (only for 'send') */
  sendParams?: { amount: string; asset?: string; to: string; resolvedAddress: string };
  /** Optional: imported mnemonic for onboarding */
  onboardMnemonic?: string;
  /** Awaiting confirmation before asking for password */
  awaitingConfirmation?: boolean;
  createdAt: number;
}

/** Telegram user ID → pending session */
const pendingSessions = new Map<number, PendingSession>();

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

let botInstance: TelegramBot | null = null;

/**
 * Initialize and start the Telegram bot in long-polling mode.
 * Returns the bot instance or null if token is not configured.
 */
export function startTelegramBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — bot disabled");
    return null;
  }

  if (botInstance) {
    console.warn("[Telegram] Bot already running");
    return botInstance;
  }

  const bot = new TelegramBot(token, { polling: true });
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
export function stopTelegramBot(): void {
  if (botInstance) {
    botInstance.stopPolling();
    botInstance = null;
    console.log("[Telegram] Bot stopped");
  }
}

// ─── Message Handler ────────────────────────────────────────────────────────

async function handleMessage(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text?.trim();

  if (!userId || !text) return;

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
        } else {
          pendingSessions.delete(userId);
          await reply(bot, chatId, "❌ Transaction cancelled.");
          return;
        }
      }

      // Otherwise, this message IS the password
      pendingSessions.delete(userId);
      const password = text;

      // Try to delete the password message
      try {
        await bot.deleteMessage(chatId, msg.message_id);
      } catch {
        // Can't delete in private chats without admin rights — that's fine
      }

      // Execute the pending action
      if (pending.action === "onboard") {
        await executeOnboard(bot, chatId, userId, password, msg.from?.username, pending.onboardMnemonic);
      } else if (pending.action === "send" && pending.sendParams) {
        await executeSend(bot, chatId, userId, password, pending.sendParams);
      } else if (pending.action === "get_pvt_key") {
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

  } catch (err) {
    console.error("[Telegram] Message handler error:", err);
    await reply(bot, chatId, `❌ Internal error: ${err instanceof Error ? err.message : "Unknown"}`);
  }
}

// ─── Command Handlers ───────────────────────────────────────────────────────

async function sendWelcome(bot: TelegramBot, chatId: number): Promise<void> {
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

async function handleBalance(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
  if (!user?.phone) {
    await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
    return;
  }

  const result = await getBalance(user.phone, {});
  if (result.success) {
    await reply(bot, chatId, `💰 Balance: ${result.balance} ALGO`);
  } else {
    await reply(bot, chatId, `❌ ${result.error}`);
  }
}

async function handleAddress(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
  if (!user?.phone) {
    await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
    return;
  }

  const result = await getAddress(user.phone);
  if (result.success) {
    await reply(bot, chatId, `📱 Your address:\n\`${result.address}\``);
  } else {
    await reply(bot, chatId, `❌ ${result.error}`);
  }
}

async function handleFund(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
  if (!user?.phone) {
    await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
    return;
  }

  const result = await fundUser(user.phone);
  if (result.success) {
    await reply(bot, chatId, `✅ Funded 1 ALGO\n💰 ${result.explorerUrl}`);
  } else {
    await reply(bot, chatId, `❌ ${result.error}`);
  }
}

async function handleTransactions(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
  if (!user?.phone) {
    await reply(bot, chatId, "❌ Not onboarded. Use `create wallet` first.");
    return;
  }

  const result = await getTransactions(user.phone, 5);
  if (result.success && result.transactions?.length) {
    const lines = result.transactions.map((tx, i) => {
      const dir = tx.sender === result.address ? "⬆️ Sent" : "⬇️ Received";
      const amt = tx.amount ? `${tx.amount} ALGO` : tx.type;
      const date = tx.roundTime.slice(0, 10);
      return `${i + 1}. ${dir} ${amt} (${date})\n   [View](${tx.explorerUrl})`;
    });
    await reply(bot, chatId, `📋 Last ${result.transactions.length} transactions:\n\n${lines.join("\n\n")}`, true);
  } else if (result.success) {
    await reply(bot, chatId, "📋 No transactions found.");
  } else {
    await reply(bot, chatId, `❌ ${result.error}`);
  }
}

async function handleCreateWallet(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  // Check if already onboarded
  const existing = await findUserByTelegramId(userId.toString());
  if (existing?.address) {
    await reply(bot, chatId, `📱 Already onboarded.\nAddress: \`${existing.address}\``, true);
    return;
  }

  // Start onboard flow — ask for password
  pendingSessions.set(userId, {
    action: "onboard",
    createdAt: Date.now(),
  });

  await reply(bot, chatId, [
    "🔐 *Create Wallet*",
    "",
    "Choose a password and reply with it.",
    "⚠️ Remember it — it cannot be recovered!",
  ].join("\n"), true);
}

async function handleImportWallet(bot: TelegramBot, chatId: number, userId: number, mnemonic: string): Promise<void> {
  const existing = await findUserByTelegramId(userId.toString());
  if (existing?.address) {
    await reply(bot, chatId, `📱 Already onboarded.\nAddress: \`${existing.address}\``, true);
    return;
  }

  // Try to delete the message containing the mnemonic
  try {
    // Note: Can't delete in private chats without admin rights
  } catch { }

  pendingSessions.set(userId, {
    action: "onboard",
    onboardMnemonic: mnemonic,
    createdAt: Date.now(),
  });

  await reply(bot, chatId, [
    "🔐 *Import Wallet*",
    "",
    "Reply with a password to encrypt and secure it.",
    "⚠️ Remember it — it cannot be recovered!",
  ].join("\n"), true);
}

async function handleSend(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  amountStr: string,
  target: string
): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
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
  const resolved = await resolveTarget(target);
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

async function handleGetPvtKey(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
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

async function handleLinkPhone(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  phone: string,
  username?: string
): Promise<void> {
  try {
    await linkTelegramToPhone(
      userId.toString(),
      phone,
      username ?? ""
    );
    await reply(bot, chatId, `✅ Phone ${phone} linked to your Telegram account.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already linked")) {
      await reply(bot, chatId, "❌ This Telegram account is already linked to a phone number.");
    } else if (msg.includes("not found")) {
      await reply(bot, chatId, "❌ Phone number not onboarded via SMS. Onboard via SMS first, then link.");
    } else {
      await reply(bot, chatId, `❌ Link failed: ${msg}`);
    }
  }
}

// ─── Action Executors (step 2 — after password) ─────────────────────────────

async function executeOnboard(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  password: string,
  username?: string,
  importedMnemonic?: string
): Promise<void> {
  try {
    const falconKeypair = await PostQuantumWallet.generateFalconKeypair();

    const algorandSeed = createHash("sha512")
      .update(Buffer.from(falconKeypair.secretKey))
      .update(Buffer.from(falconKeypair.publicKey))
      .digest()
      .subarray(0, 32);

    const algorandPublicKey = ed25519.getPublicKey(algorandSeed);
    const algorandSecretKey = Buffer.concat([
      Buffer.from(algorandSeed),
      Buffer.from(algorandPublicKey),
    ]);

    const addressStr = algosdk.encodeAddress(algorandPublicKey);
    const mnemonic = algosdk.secretKeyToMnemonic(new Uint8Array(algorandSecretKey));

    const encrypted = encryptMnemonic(mnemonic, password);

    await insertTelegramUser(
      userId.toString(),
      addressStr,
      encrypted,
      username ?? ""
    );

    // Index the handle for @username resolution
    if (username) {
      indexTelegramHandle(username, addressStr);
    }

    await reply(bot, chatId, [
      "✅ Wallet created!",
      "",
      `📱 Address: \`${addressStr}\``,
      "",
      "Use `fund me` to get testnet ALGO.",
    ].join("\n"), true);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already onboarded")) {
      await reply(bot, chatId, "📱 You are already onboarded!");
    } else {
      await reply(bot, chatId, `❌ Onboard failed: ${msg}`);
    }
  }
}

async function executeSend(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  password: string,
  params: { amount: string; asset?: string; to: string; resolvedAddress: string }
): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
  if (!user?.phone) {
    await reply(bot, chatId, "❌ Account not found.");
    return;
  }

  const sendResult = await sendAlgo(user.phone, password, {
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
  } else {
    await reply(bot, chatId, `❌ Send failed: ${sendResult.error}`);
  }
}

async function executeGetPvtKey(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  password: string
): Promise<void> {
  const user = await findUserByTelegramId(userId.toString());
  if (!user?.encrypted_mnemonic || !user?.address) {
    await reply(bot, chatId, "❌ Account not found or not onboarded.");
    return;
  }

  try {
    const secret = decryptWalletSecret(user.encrypted_mnemonic, password);
    await reply(bot, chatId, [
      "🔑 Your recovery phrase:",
      "",
      `\`${secret.mnemonic}\``,
      "",
      "⚠️ NEVER share this with anyone!",
      "⚠️ Delete this message immediately after saving.",
    ].join("\n"), true);
  } catch {
    await reply(bot, chatId, "❌ Wrong password.");
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

async function reply(
  bot: TelegramBot,
  chatId: number,
  text: string,
  markdown: boolean = false
): Promise<void> {
  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: markdown ? "Markdown" : undefined,
      disable_web_page_preview: true,
    });
  } catch (err) {
    // If markdown parsing fails, retry without markdown
    if (markdown) {
      try {
        await bot.sendMessage(chatId, text, {
          disable_web_page_preview: true,
        });
      } catch (retryErr) {
        console.error("[Telegram] Failed to send message even without markdown:", retryErr);
      }
    } else {
      console.error("[Telegram] Failed to send message:", err);
    }
  }
}
