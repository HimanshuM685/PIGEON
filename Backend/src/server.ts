import "dotenv/config";
import express from "express";
import cors from "cors";
import { getIntent, type IntentResult } from "./intent";
import { onboardUser } from "./onboard";
import { sendAlgo } from "./send";
import { getBalance } from "./balance";
import { getAddress } from "./address";
import { fundUser } from "./fund";
import { getTransactions } from "./transactions";
import { findOnboardedUser } from "./onchain";
import { decryptWalletSecret } from "./crypto/walletSecret";
import { setupWebhookRoutes } from "./webhook";
import postQuantumRoutes from "./routes/postQuantumRoutes";
import { startTelegramBot } from "./telegramBot";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/pq-wallet", postQuantumRoutes);

// Setup webhook routes for SMS gateway integration
setupWebhookRoutes(app);

interface SmsRequestBody {
  from?: string;
  message?: string;
  /** @deprecated use message */
  messege?: string;
  /** Required for onboard and send: user password (encrypts wallet on onboard, decrypts to sign on send) */
  password?: string;
  /** Optional: import an existing wallet by 12/24-word mnemonic during onboarding */
  mnemonic?: string;
}

app.post("/api/sms", async (req, res) => {
  try {
    const body = req.body as SmsRequestBody;
    const from = body.from;
    const message = body.message ?? body.messege;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        ok: false,
        error: "Missing or invalid 'message' in body. Expected JSON: { from, message }",
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured",
      });
      return;
    }

    const intentResult: IntentResult = await getIntent(message, apiKey);

    const payload: Record<string, unknown> = {
      ok: true,
      from: from ?? null,
      message,
      intent: intentResult.intent,
      params: intentResult.params,
      chain: "algorand",
    };

    if (intentResult.intent === "onboard") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'onboard' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const password = body.password;
      if (!password || typeof password !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'onboard' requires 'password' in the request body (used to encrypt your wallet; never stored)",
        });
        return;
      }
      const onboarding = await onboardUser(
        from,
        password,
        body.mnemonic ?? intentResult.params.mnemonic
      );
      payload.onboarding = onboarding;
      if (onboarding.error && !onboarding.alreadyOnboarded) {
        res.status(500).json({ ...payload, ok: false, error: onboarding.error });
        return;
      }
    }

    if (intentResult.intent === "send") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'send' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const password = body.password;
      if (!password || typeof password !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'send' requires 'password' in the request body (used to decrypt wallet to sign the transaction)",
        });
        return;
      }
      const sendResult = await sendAlgo(from, password, {
        amount: intentResult.params.amount ?? "0",
        asset: intentResult.params.asset,
        to: intentResult.params.to ?? "",
      });
      payload.send = sendResult;
      if (!sendResult.success) {
        res.status(400).json({ ...payload, ok: false, error: sendResult.error });
        return;
      }
    }

    if (intentResult.intent === "get_balance") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'get_balance' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const balanceResult = await getBalance(from, { asset: intentResult.params.asset });
      payload.balance = balanceResult;
      if (!balanceResult.success) {
        res.status(400).json({ ...payload, ok: false, error: balanceResult.error });
        return;
      }
    }

    if (intentResult.intent === "get_txn") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'get_txn' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const txnResult = await getTransactions(from, 5);
      payload.transactions = txnResult;
      if (!txnResult.success) {
        res.status(400).json({ ...payload, ok: false, error: txnResult.error });
        return;
      }
    }

    if (intentResult.intent === "get_address") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'get_address' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const addressResult = await getAddress(from);
      payload.address = addressResult;
      if (!addressResult.success) {
        res.status(400).json({ ...payload, ok: false, error: addressResult.error });
        return;
      }
    }

    if (intentResult.intent === "fund") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'fund' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const fundResult = await fundUser(from);
      payload.fund = fundResult;
      if (!fundResult.success) {
        res.status(400).json({ ...payload, ok: false, error: fundResult.error });
        return;
      }
    }

    if (intentResult.intent === "get_pvt_key") {
      if (!from || typeof from !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'get_pvt_key' requires 'from' (phone number) in the request body",
        });
        return;
      }
      const password = body.password;
      if (!password || typeof password !== "string") {
        res.status(400).json({
          ok: false,
          error: "Intent 'get_pvt_key' requires 'password' in the request body",
        });
        return;
      }
      const user = await findOnboardedUser(from);
      if (!user?.encrypted_mnemonic || !user?.address) {
        res.status(400).json({ ...payload, ok: false, error: "Account not found or not onboarded" });
        return;
      }
      try {
        const walletSecret = decryptWalletSecret(user.encrypted_mnemonic, password);
        payload.pvtKey = { success: true, mnemonic: walletSecret.mnemonic };
      } catch {
        res.status(400).json({ ...payload, ok: false, error: "Wrong password" });
        return;
      }
    }

    res.json(payload);
  } catch (err) {
    console.error("POST /api/sms error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Intent extraction failed",
    });
  }
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);

  // Start Telegram bot alongside Express server
  const telegramBot = startTelegramBot();
  if (telegramBot) {
    console.log("Telegram bot running in long-polling mode");
  }
});
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process or set PORT to another value.`);
    process.exit(1);
  }
  throw err;
});
