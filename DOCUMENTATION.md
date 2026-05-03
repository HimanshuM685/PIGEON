# PIGEON - System Documentation

## 1. Overview

PIGEON provides SMS and Telegram-driven Algorand wallet operations with AI intent parsing and on-chain user registry storage.

Primary components:
1. `Backend/` - intent parsing, onboarding, signing, API/webhook routing, Telegram bot.
2. `Pigeon-Contract/` - Algorand smart contract for phone/Telegram-keyed user records.
3. `ESP32-Firmware/` - GSM/SMS gateway integration.

## 2. Current wallet model (updated)

PIGEON now uses a **hybrid post-quantum onboarding flow**:

1. **Default onboarding**
   - Generate BIP39 mnemonic (24 words by default).
   - Generate Falcon keypair (WASM `falcon-crypto`).
   - Derive Algorand address from mnemonic.
2. **Import onboarding**
   - Accept user-provided 12/24-word mnemonic.
   - Validate mnemonic, derive Algorand address, generate Falcon keypair.
3. **On-chain persistence**
   - Store only encrypted mnemonic in existing contract field (`encryptedMnemonic`) to keep storage footprint lower.

## 3. Smart contract alignment

Contract file:
- `Pigeon-Contract/projects/Pigeon-Contract/smart_contracts/contract_pigeon/contract.algo.ts`

Stored user fields:
1. `address`
2. `encryptedMnemonic`
3. `createdAt`
4. `telegramHandle`

Telegram identity mapping (BoxMap, `t` prefix):
- Key: Telegram user ID (numeric string)
- Value: phone/synthetic key linking to the primary `users` BoxMap

**Status:** backend and contract are aligned; contract extended with Telegram identity support.

## 4. Backend API surfaces

### 4.1 SMS API

Endpoint:
- `POST /api/sms`

Supported intents:
1. `onboard`
2. `send`
3. `get_balance`
4. `get_address`
5. `get_txn`
6. `fund`
7. `get_pvt_key`

Onboarding request supports:
- `password` (required)
- `mnemonic` (optional, for import flow)

### 4.2 Telegram Bot

The Telegram bot runs in **long-polling mode** alongside the Express server.

Supported commands:
1. `create wallet` — create new Falcon wallet
2. `import wallet <mnemonic>` — import existing wallet
3. `send <amount> algo to <target>` — send ALGO (targets: @username, +phone, wallet address)
4. `balance` — check wallet balance
5. `address` — get wallet address
6. `fund me` — request testnet ALGO from admin
7. `get txn` — show last 5 transactions
8. `get pvt key` — export recovery phrase (password required)
9. `link phone +91XXXXXXXXXX` — link SMS identity to Telegram

Identity resolution:
- `+phone` → on-chain phone lookup → Algorand address
- `@username` → in-memory handle index → Algorand address
- Raw string → validate as Algorand address

Configuration:
- `TELEGRAM_BOT_TOKEN` — from @BotFather

### 4.3 Post-Quantum API

Base route:
- `POST /api/pq-wallet/*`

Endpoints:
1. `/generate` - generate Falcon + mnemonic wallet material.
2. `/recover` - import/recover from mnemonic.
3. `/sign` - Falcon detached signature.
4. `/verify` - Falcon signature verification.
5. `/onboard` - create/import onboarding record.

## 5. SMS webhook flow (two-step secure actions)

For sensitive actions (`onboard`, `send`, `get_pvt_key`):
1. User sends command.
2. Backend asks for password.
3. User replies password.
4. Backend executes and returns result.

Import onboarding now works in this flow as well (mnemonic can be carried in the pending onboarding session).

The Telegram bot follows the same two-step pattern, with an additional confirmation step for send transactions.

## 6. Security model

1. Password is never stored.
2. Mnemonic is encrypted with AES-256-GCM + PBKDF2 before storage.
3. Decryption happens only when needed (send/export).
4. On-chain contract write actions remain admin-gated.
5. Falcon signing routes are explicit API calls (no silent fallback).
6. Telegram bot attempts to delete password messages after processing.
7. Security warnings sent after any password-containing message.

## 7. Relevant files

Backend:
1. `Backend/src/onboard.ts`
2. `Backend/src/send.ts`
3. `Backend/src/server.ts`
4. `Backend/src/webhook.ts`
5. `Backend/src/telegramBot.ts`
6. `Backend/src/telegramIdentity.ts`
7. `Backend/src/routes/postQuantumRoutes.ts`
8. `Backend/src/crypto/postQuantumWallet.ts`
9. `Backend/src/crypto/walletSecret.ts`

Contract:
1. `Pigeon-Contract/projects/Pigeon-Contract/smart_contracts/contract_pigeon/contract.algo.ts`

Extended backend PQ doc:
1. `Backend/POST_QUANTUM_WALLET.md`

## 8. Docker deployment

### 8.1 Architecture

The backend uses a multi-stage Docker build:

1. **Builder stage** (`node:20-slim` + `build-essential`)
   - Installs all dependencies (including devDependencies for `tsc`).
   - Compiles the Falcon CLI from C sources (`falcon-main/`).
   - Transpiles TypeScript to `dist/`.
2. **Runtime stage** (`node:20-slim`)
   - Installs production-only dependencies.
   - Copies compiled JS output and the Falcon CLI binary.
   - Runs `node dist/server.js`.

### 8.2 Files

| File | Purpose |
|------|---------|
| `Backend/Dockerfile` | Multi-stage build (compile C + TS → lean production image) |
| `Backend/docker-compose.yml` | Single-command deploy, reads `.env`, auto-restart |
| `Backend/.dockerignore` | Excludes `node_modules`, `dist`, `.env`, dev files from build context |

### 8.3 Usage

```bash
cd Backend
cp .env.example .env
nano .env                        # fill in secrets
docker compose up -d --build     # build & start in background
docker compose logs -f           # tail logs
docker compose down              # stop
```

The server listens on port `3000` (configurable via `PORT` in `.env`).
Container restarts automatically on crash (`unless-stopped` policy).

