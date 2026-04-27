"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const intent_1 = require("./intent");
const onboard_1 = require("./onboard");
const send_1 = require("./send");
const balance_1 = require("./balance");
const address_1 = require("./address");
const fund_1 = require("./fund");
const transactions_1 = require("./transactions");
const onchain_1 = require("./onchain");
const walletSecret_1 = require("./crypto/walletSecret");
const webhook_1 = require("./webhook");
const postQuantumRoutes_1 = __importDefault(require("./routes/postQuantumRoutes"));
const telegramBot_1 = require("./telegramBot");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/pq-wallet", postQuantumRoutes_1.default);
// Setup webhook routes for SMS gateway integration
(0, webhook_1.setupWebhookRoutes)(app);
app.post("/api/sms", async (req, res) => {
    try {
        const body = req.body;
        const from = body.from;
        const message = body.message ?? body.messege;
        if (!message || typeof message !== "string") {
            res.status(400).json({
                ok: false,
                error: "Missing or invalid 'message' in body. Expected JSON: { from, message }",
            });
            return;
        }
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            res.status(500).json({
                ok: false,
                error: "OPENROUTER_API_KEY is not configured",
            });
            return;
        }
        const intentResult = await (0, intent_1.getIntent)(message, apiKey);
        const payload = {
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
            const onboarding = await (0, onboard_1.onboardUser)(from, password, body.mnemonic ?? intentResult.params.mnemonic);
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
            const sendResult = await (0, send_1.sendAlgo)(from, password, {
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
            const balanceResult = await (0, balance_1.getBalance)(from, { asset: intentResult.params.asset });
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
            const txnResult = await (0, transactions_1.getTransactions)(from, 5);
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
            const addressResult = await (0, address_1.getAddress)(from);
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
            const fundResult = await (0, fund_1.fundUser)(from);
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
            const user = await (0, onchain_1.findOnboardedUser)(from);
            if (!user?.encrypted_mnemonic || !user?.address) {
                res.status(400).json({ ...payload, ok: false, error: "Account not found or not onboarded" });
                return;
            }
            try {
                const walletSecret = (0, walletSecret_1.decryptWalletSecret)(user.encrypted_mnemonic, password);
                payload.pvtKey = { success: true, mnemonic: walletSecret.mnemonic };
            }
            catch {
                res.status(400).json({ ...payload, ok: false, error: "Wrong password" });
                return;
            }
        }
        res.json(payload);
    }
    catch (err) {
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
    const telegramBot = (0, telegramBot_1.startTelegramBot)();
    if (telegramBot) {
        console.log("Telegram bot running in long-polling mode");
    }
});
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the other process or set PORT to another value.`);
        process.exit(1);
    }
    throw err;
});
