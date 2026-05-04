import "dotenv/config";
import express from "express";
import cors from "cors";
import { setupWebhookRoutes } from "./webhook";
import postQuantumRoutes from "./routes/postQuantumRoutes";
import { startTelegramBot } from "./telegramBot";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/pq-wallet", postQuantumRoutes);

// Setup webhook routes for SMS gateway integration
setupWebhookRoutes(app);


const port = Number(process.env.PORT) || 7575;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);

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
