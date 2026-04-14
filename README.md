# PIGEON

PIGEON is an **SMS-first Algorand wallet system** with:

1. **Backend** (`Backend/`) for intent parsing, onboarding, signing, and SMS/webhook orchestration.
2. **Smart Contract** (`Pigeon-Contract/`) for on-chain user registry storage (phone → address + encrypted mnemonic).
3. **Firmware** (`ESP32-Firmware/`) for GSM/SMS gateway flows.

## What changed (latest)

The backend now uses a **hybrid post-quantum wallet flow** by default:

1. **Falcon + mnemonic onboarding by default**
   - New onboarding no longer uses plain `algosdk.generateAccount()`.
   - Backend generates (or imports) a BIP39 mnemonic, generates Falcon keys, and derives Algorand address from the mnemonic.
2. **Mnemonic import support for users**
   - Users can import existing 12/24-word mnemonics during onboarding.
3. **Contract compatibility preserved**
   - Contract schema stays unchanged (`address`, `encrypted_mnemonic`, `created_at`), so deployment compatibility is maintained.

## Backend API highlights

### SMS API
- `POST /api/sms`
  - Supports intents: `onboard`, `send`, `get_balance`, `get_address`, `get_txn`, `fund`, `get_pvt_key`.
  - `onboard` now accepts optional `mnemonic` for wallet import.

### Post-Quantum routes
- Base path: `POST /api/pq-wallet/*`
- Endpoints:
  - `/generate` → generate Falcon + mnemonic wallet material
  - `/recover` → validate/import mnemonic and produce wallet material
  - `/sign` → Falcon sign
  - `/verify` → Falcon verify
  - `/onboard` → create/import user wallet into backend + on-chain registry

## Smart contract

Contract location:
- `Pigeon-Contract/projects/Pigeon-Contract/smart_contracts/contract_pigeon/contract.algo.ts`

Current data model (BoxMap, phone-keyed):
- `address`
- `encryptedMnemonic`
- `createdAt`

No contract field changes were required for Falcon-by-default onboarding, because Falcon integration is handled in backend logic while on-chain storage remains schema-stable.

## Quick start

### Backend
```bash
cd Backend
npm install
npm run dev
```

### Contract project
```bash
cd Pigeon-Contract/projects/Pigeon-Contract
npm install
npm run build
```

## Additional docs

- Root architecture: `DOCUMENTATION.md`
- Backend PQ details: `Backend/POST_QUANTUM_WALLET.md`
- Contract details: `Pigeon-Contract/projects/Pigeon-Contract/README.md`
