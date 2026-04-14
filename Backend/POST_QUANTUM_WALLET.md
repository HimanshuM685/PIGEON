# Post-Quantum Wallet Integration

This PIGEON backend now includes **FALCON post-quantum cryptography** integrated with BIP39 onboarding/import flows.

## Overview

**FALCON** is a lattice-based digital signature scheme standardized by NIST for post-quantum cryptography. Combined with **BIP39 mnemonics**, this provides:

- 🔐 **Quantum-resistant signing primitives** via Falcon
- 🆔 **BIP39 wallet recovery** (12-24 word mnemonics)
- ⚡ **WASM-based FALCON** (faster than pure JS)
- 🔄 **Hybrid approach**: BIP39 for Algorand account derivation + FALCON keypair generation

## Default onboarding behavior

On `onboard`:
1. Generate mnemonic by default (or use user-provided mnemonic for import).
2. Generate Falcon keypair.
3. Derive Algorand address from mnemonic.
4. Encrypt and store mnemonic on-chain via existing contract field.

This keeps smart-contract schema compatibility while enabling Falcon-by-default onboarding.

## Installation

The dependencies are already installed:

```bash
npm install falcon-crypto bip39
```

## Usage

### 1. Generate a New Wallet

```typescript
import { PostQuantumWallet } from "./crypto/postQuantumWallet";

async function example() {
  // Initialize (optional)
  await PostQuantumWallet.initialize();

  // Generate 24-word BIP39 mnemonic + FALCON keypair
  const wallet = await PostQuantumWallet.generateWallet(256);

  console.log("📝 Mnemonic:", wallet.mnemonic);
  console.log("🔑 Public Key:", PostQuantumWallet.publicKeyToHex(wallet.falconKeypair.publicKey));
}
```

### 2. Sign a Transaction

```typescript
const message = "send 100 ALGO to alice.algo";
const signature = await PostQuantumWallet.signMessage(
  message,
  wallet.falconKeypair.secretKey
);

console.log("🖊️ Signature:", Buffer.from(signature).toString("hex"));
```

### 3. Verify Signature

```typescript
const isValid = await PostQuantumWallet.verifySignature(
  signature,
  message,
  wallet.falconKeypair.publicKey
);

console.log("✓ Valid:", isValid);
```

### 4. Recover Wallet from Mnemonic

```typescript
const recoveredWallet = await PostQuantumWallet.recoverWallet(mnemonic);
console.log("✓ Wallet recovered");
```

## REST API Endpoints

### Generate Wallet
```bash
POST /api/pq-wallet/generate
Content-Type: application/json

{
  "strength": 256  // 128 (12-word) or 256 (24-word), default: 256
}

Response:
{
  "success": true,
  "data": {
    "mnemonic": "duty later during brand bid ceiling...",
    "publicKey": "0a828a995830d172855886435c069e0a5d...",
    "createdAt": "2026-04-14T18:47:35.964Z"
  }
}
```

### Recover Wallet
```bash
POST /api/pq-wallet/recover
Content-Type: application/json

{
  "mnemonic": "duty later during brand bid ceiling..."
}

Response:
{
  "success": true,
  "data": {
    "mnemonic": "duty later during brand bid ceiling...",
    "publicKey": "0a828a995830d172855886435c069e0a5d...",
    "createdAt": "2026-04-14T18:47:35.964Z"
  }
}
```

### Sign Message
```bash
POST /api/pq-wallet/sign
Content-Type: application/json

{
  "message": "algoETH:send 100 ALGO to alice.algo",
  "secretKey": "c0d1ff..."  // hex string
}

Response:
{
  "success": true,
  "data": {
    "signature": "f8043a1e291a77496db94b21b49163c4..."
  }
}
```

### Verify Signature
```bash
POST /api/pq-wallet/verify
Content-Type: application/json

{
  "message": "algoETH:send 100 ALGO to alice.algo",
  "signature": "f8043a1e291a77496db94b21b49163c4...",
  "publicKey": "0a828a995830d172855886435c069e0a5d..."
}

Response:
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

### Onboard (Create or Import)
```bash
POST /api/pq-wallet/onboard
Content-Type: application/json

{
  "phone": "919876543210",
  "password": "strong-password",
  "mnemonic": "abandon abandon ... zoo"   // optional; if omitted, a new mnemonic is generated
}

Response:
{
  "success": true,
  "data": {
    "alreadyOnboarded": false,
    "address": "ALGO_ADDRESS",
    "falconPublicKey": "hex...",
    "importedMnemonic": true
  }
}
```

## Architecture

```
PostQuantumWallet
├── generateWallet()      → BIP39 mnemonic + FALCON keypair
├── recoverWallet()       → From BIP39 mnemonic
├── signMessage()         → FALCON signature
├── verifySignature()     → FALCON verification
├── exportWallet()        → JSON export (⚠️ secret key sensitive)
└── importWallet()        → Restore from JSON
```

## Security Considerations

⚠️ **CRITICAL**:
- **Never expose secret keys** in API responses after initial generation
- **Store secret keys encrypted** (e.g., with hardware wallets or secure enclave)
- **Mnemonics are also secrets** - handle with care during transmission
- Use HTTPS for all API calls
- Consider rate-limiting the `/sign` endpoint

## Running the Demo

```bash
cd Backend
npx tsx src/crypto/postQuantumWalletExample.ts
```

Output:
```
🔐 Post-Quantum Wallet Demo

📝 BIP39 Mnemonic (Save securely):
duty later during brand bid ceiling eye grace rocket bottom film round...

🔑 Public Key (Hex):
0a828a995830d172855886435c069e0a5d...

✍️ Transaction: algoETH:send 100 ALGO to alice.algo
🖊️ FALCON Signature (Hex):
f8043a1e291a77496db94b21b49163c4...

✓ Signature Valid: true

🔄 Recovering wallet from mnemonic...
✓ Wallet recovered successfully
```

## Files

- `src/crypto/postQuantumWallet.ts` - Core FALCON + BIP39 implementation
- `src/crypto/postQuantumWalletExample.ts` - Demo script
- `src/routes/postQuantumRoutes.ts` - Express API endpoints
- `src/crypto/walletSecret.ts` - Wallet secret encode/decode compatibility helpers

## Next Steps

1. **Integrate into authentication**: Use FALCON signatures for SMS SMS/transaction verification
2. **Hardware wallet support**: Add Ledger/Trezor hardware wallet integration
3. **Multi-signature**: Implement threshold signatures for governance
4. **Token binding**: Store public keys on-chain for verification

## References

- [FALCON Specification](https://falcon-sign.info)
- [BIP39 Standard](https://github.com/trezor/python-mnemonic)
- [Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
