# PIGEON - System Documentation

## 1. Overview

PIGEON provides SMS-driven Algorand wallet operations with AI intent parsing and on-chain user registry storage.

Primary components:
1. `Backend/` - intent parsing, onboarding, signing, API/webhook routing.
2. `Pigeon-Contract/` - Algorand smart contract for phone-keyed user records.
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

**Status:** backend and contract are aligned; no contract schema migration required for this update.

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

### 4.2 Post-Quantum API

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

## 6. Security model

1. Password is never stored.
2. Mnemonic is encrypted with AES-256-GCM + PBKDF2 before storage.
3. Decryption happens only when needed (send/export).
4. On-chain contract write actions remain admin-gated.
5. Falcon signing routes are explicit API calls (no silent fallback).

## 7. Relevant files

Backend:
1. `Backend/src/onboard.ts`
2. `Backend/src/send.ts`
3. `Backend/src/server.ts`
4. `Backend/src/webhook.ts`
5. `Backend/src/routes/postQuantumRoutes.ts`
6. `Backend/src/crypto/postQuantumWallet.ts`
7. `Backend/src/crypto/walletSecret.ts`

Contract:
1. `Pigeon-Contract/projects/Pigeon-Contract/smart_contracts/contract_pigeon/contract.algo.ts`

Extended backend PQ doc:
1. `Backend/POST_QUANTUM_WALLET.md`
