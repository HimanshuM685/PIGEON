# Wallet creation and storage (no KMD, password-encrypted mnemonic)

Wallets are created **only on the server**. No Algorand KMD is used. The mnemonic is encrypted with a **user-chosen password** and stored in our DB; the password is **never stored** and is required only when the user wants to **send** funds (to decrypt and sign).

## Where the wallet is created

1. **On onboard** (intent `onboard`), the backend:
   - Creates an Algorand account with `algosdk.generateAccount()` (same as your script: no KMD).
   - Converts the secret key to a mnemonic with `algosdk.secretKeyToMnemonic(sk)`.
   - **Encrypts** the mnemonic with the **user’s password** (from the request body) using AES-256-GCM and PBKDF2 (see `Backend/src/crypto/mnemonic.ts`).
   - Stores in our SQLite DB: `phone`, `address`, `encrypted_mnemonic`, `created_at`.

2. **Wallet password**  
   The password is the one the user sends in the request (e.g. `password` field). It is used only to encrypt/decrypt the mnemonic. We **do not** store the password; we only store the encrypted mnemonic.

## What our backend stores

We use SQLite (e.g. `Backend/data/pigeon.db`):

| Column              | Purpose |
|---------------------|---------|
| `phone`             | Normalized user phone (primary key). |
| `address`           | Algorand address (from `generateAccount()`). |
| `encrypted_mnemonic`| Mnemonic encrypted with the user’s password. |
| `created_at`         | When the user was onboarded. |

We **do not** store:
- The user’s password
- The plain mnemonic
- The raw secret key

So:
- **Keys** exist only inside the encrypted blob; we never store them in the clear.
- **Decryption** happens only at **send** time, when the user sends their password again; we decrypt in memory, sign the transaction, and never persist the decrypted mnemonic.

## Why the client doesn’t store keys

- The **client** sends: `from` (phone), `message`, and for **onboard** / **send** a `password`.
- On **onboard**: we create the account, encrypt the mnemonic with that password, store only the encrypted value and address. The client never receives the mnemonic or secret key.
- On **send**: we look up the user by phone, decrypt the mnemonic with the provided password, sign the transaction, submit to the network, then discard the decrypted data.
- The client never receives the mnemonic or secret key; it only sends the password when it wants to sign (e.g. to send funds).

## Flow summary

**Onboard**
```
User → POST /api/sms with from, message: "sign up", password: "<user-chosen>"
  → getIntent() → intent = "onboard"
  → generateAccount() → mnemonic = secretKeyToMnemonic(sk)
  → encryptMnemonic(mnemonic, password)
  → insertOnboardedUser(phone, address, encryptedMnemonic)
  → response: { onboarding: { address } }  (no mnemonic, no keys)
```

**Send**
```
User → POST /api/sms with from, message: "send 10 ALGO to ABC...", password: "<same as onboard>"
  → getIntent() → intent = "send", params: { amount, to }
  → findOnboardedUser(phone) → encrypted_mnemonic, address
  → decryptMnemonic(encrypted_mnemonic, password) → mnemonic
  → mnemonicToSecretKey(mnemonic) → sign transaction → submit via algod
  → response: { send: { success, txId } }
```

If the user loses their password, we cannot decrypt the mnemonic; they lose access to that wallet (by design).
