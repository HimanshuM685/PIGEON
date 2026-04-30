"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const webhook_1 = require("./webhook");
const postQuantumRoutes_1 = __importDefault(require("./routes/postQuantumRoutes"));
const telegramBot_1 = require("./telegramBot");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/pq-wallet", postQuantumRoutes_1.default);
// Setup webhook routes for SMS gateway integration
(0, webhook_1.setupWebhookRoutes)(app);
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
