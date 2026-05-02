# 🕊️ PIGEON

**Send crypto over SMS and Telegram.** PIGEON lets anyone create an Algorand wallet and send ALGO using just text messages — no app downloads, no browser extensions.

---

## What is this?

| Component | What it does |
|---|---|
| **Backend** (`Backend/`) | Express server + Telegram bot. Parses commands, manages wallets, signs transactions. |
| **Smart Contract** (`Pigeon-Contract/`) | On-chain user registry on Algorand. Stores encrypted wallets keyed by phone or Telegram ID. |
| **ESP32 Firmware** (`ESP32-Firmware/`) | Optional hardware SMS gateway using a SIM800L module. |

---

## How to run

### Prerequisites

- **Node.js** ≥ 18
- An **Algorand TestNet** admin wallet (25-word mnemonic) — you'll need this to fund users and write to the contract
- A **deployed ContractPigeon** smart contract (get the App ID after deploying)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- *(Optional)* A [SMSGate](https://sms-gate.app/) account for SMS gateway

### 1. Clone & install

```bash
git clone https://github.com/HimanshuM685/PIGEON.git
cd PIGEON/Backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# Required ──────────────────────────────────────────
OPENROUTER_API_KEY=your_openrouter_key   # Powers intent parsing via OpenRouter/Gemma
ADMIN_MNEMONIC=word1 word2 ... word25    # Algorand admin wallet (signs contract calls)
PIGEON_APP_ID=123456789                  # App ID of your deployed ContractPigeon

# Algorand TestNet (defaults work out of the box)
ALGOD_SERVER=https://testnet-api.algonode.cloud

# Telegram Bot (optional — skip to run SMS-only) ────
TELEGRAM_BOT_TOKEN=your_token_from_botfather

# SMS via SMSGate (optional) ────────────────────────
SMSGATE_BASE_URL=https://api.sms-gate.app
SMSGATE_USERNAME=your_username
SMSGATE_PASSWORD=your_password
```

### 3. Start

```bash
npm run dev
```

That's it. The server starts on `http://localhost:3000` and the Telegram bot (if configured) starts polling automatically.

### 4. Deploy the smart contract (if not already deployed)

```bash
cd Pigeon-Contract/projects/Pigeon-Contract
npm install
npm run build
# Deploy using AlgoKit — set the returned App ID in your .env
```

---

## Telegram Bot Commands

Talk to your bot in Telegram. It acts like a CLI — not a chatbot.

| Command | What it does |
|---|---|
| `create wallet` | Create a new Algorand wallet (prompts to share phone number & password) |
| `import wallet <mnemonic words>` | Import an existing wallet (prompts to share phone number & password) |
| `balance` | Check your ALGO balance |
| `address` | Show your wallet address |
| `send 1 algo to @username` | Send ALGO to a Telegram user |
| `send 0.5 algo to +919876543210` | Send ALGO to a phone number |
| `send 2 algo to ALGO_ADDRESS...` | Send ALGO to a wallet address |
| `fund me` | Get 1 free testnet ALGO |
| `get txn` | Show last 5 transactions |
| `get pvt key` | Export recovery phrase (requires password) |
| `link phone +919876543210` | Link your phone number to Telegram |

**Security:** Sensitive actions (send, export key) always ask for your password first. The bot tries to delete your password message and warns you to do the same.

---

## SMS Commands

Send an SMS to the configured gateway number. Same commands, same wallet.

| SMS | Action |
|---|---|
| `create wallet` | Onboard + create wallet |
| `balance` | Check balance |
| `send 5 algo to +919876543210` | Send ALGO |
| `fund me` | Request testnet funds |
| `get pvt key` | Export recovery phrase |

---

## API

The backend also exposes a REST API:

| Endpoint | Description |
|---|---|
| `POST /api/sms-webhook` | For **SMSGate Android App** (sms:received webhook) |
| `POST /api/esp32-sms-webhook` | For **ESP32 Hardware** (SIM800L webhook) |
| `POST /api/pq-wallet/*` | For **External Apps/Integrations** (Post-quantum operations) |
| `GET /api/webhook-health` | For **Uptime Monitoring** (Health check) |

---

## Project structure

```
PIGEON/
├── Backend/
│   └── src/
│       ├── server.ts              # Express server + bot startup
│       ├── telegramBot.ts         # Telegram bot logic
│       ├── telegramIdentity.ts    # @user / +phone / address resolver
│       ├── webhook.ts             # SMS webhook handler
│       ├── intent.ts              # AI intent parser (OpenRouter/Gemma)
│       ├── onboard.ts             # Wallet creation
│       ├── send.ts                # ALGO transfers
│       ├── balance.ts             # Balance lookup
│       ├── fund.ts                # Testnet faucet
│       ├── onchain.ts             # On-chain data layer
│       └── crypto/                # Encryption + Falcon PQ keys
├── Pigeon-Contract/               # Algorand smart contract (TEALScript)
└── ESP32-Firmware/                # Hardware SMS gateway
```

---

## Docs

- **Architecture deep-dive:** [`DOCUMENTATION.md`](./DOCUMENTATION.md)
- **Post-quantum wallet details:** [`Backend/POST_QUANTUM_WALLET.md`](./Backend/POST_QUANTUM_WALLET.md)
- **SMS gateway setup:** [`Backend/sms-gateway-setup.md`](./Backend/sms-gateway-setup.md)
