# PIGEON Contract

Smart contract project for storing onboarded user metadata on Algorand.

## Overview

`ContractPigeon` is an admin-managed registry that maps a normalized phone number to user onboarding data.

On-chain storage uses a `BoxMap` with key prefix `u`:

- Key: `phone` (`arc4.Str`, digits-only normalized string)
- Value: `UserData`
  - `address` (`arc4.Str`)
  - `encryptedMnemonic` (`arc4.Str`)
  - `createdAt` (`arc4.Uint64`)

Global state:

- `admin`: creator address set during `createApplication()`
- `totalUsers`: running count of onboarded users

## Contract File

- `smart_contracts/hello_world/contract.algo.ts`

## Data Model Mapping

The contract is designed to mirror this backend table shape:

- `phone TEXT PRIMARY KEY` -> box key
- `address TEXT NOT NULL` -> `UserData.address`
- `encrypted_mnemonic TEXT NOT NULL` -> `UserData.encryptedMnemonic`
- `created_at INTEGER NOT NULL` -> `UserData.createdAt`

## Methods

### Lifecycle

- `createApplication(): void`
  - Sets `admin` to `Txn.sender` at creation.

### Admin-only mutating methods

- `onboardUser(phone, address, encryptedMnemonic, createdAt): void`
  - Requires sender is admin.
  - Fails if `phone` already exists.
  - Creates a new user box.
  - Increments `totalUsers`.

- `updateUser(phone, address, encryptedMnemonic): void`
  - Requires sender is admin.
  - Fails if `phone` is not found.
  - Updates address and encrypted mnemonic.
  - Preserves original `createdAt`.

- `deleteUser(phone): void`
  - Requires sender is admin.
  - Fails if `phone` is not found.
  - Deletes user box.
  - Decrements `totalUsers`.

### Read methods

- `getUser(phone): UserData`
  - Fails if `phone` is not found.
  - Returns full user struct.

- `userExists(phone): boolean`
  - Returns `true` if user box exists.

- `getUserAddress(phone): arc4.Str`
  - Fails if `phone` is not found.
  - Returns only wallet address.

- `getTotalUsers(): uint64`
  - Returns global counter.

## Access Control

All write operations call `assertAdmin()`:

- Allowed sender: `Txn.sender === admin`
- Revert message: `Only the admin can perform this action`

## Box Storage and MBR

Each user record is stored in one Algorand box.

- Box name format: `"u" + phone`
- Approximate minimum balance requirement per box:
  - `2500 + 400 * (keyLen + valueLen)` microAlgos

When onboarding users, ensure the app account is funded enough to cover additional box MBR.

## Build and Deploy

From this folder (`pigeon-contract/projects/pigeon-contract`):

```bash
npm install
algokit generate env-file -a target_network localnet
algokit localnet start
npm run build
npm run deploy -- hello_world
```

Notes:

- `npm run build` compiles contracts and generates typed clients under `smart_contracts/artifacts`.
- `npm run deploy -- hello_world` runs the deployer at `smart_contracts/hello_world/deploy-config.ts`.

## Scripts

- `npm run build` -> compile + typed client generation
- `npm run deploy` -> deploy contracts via `smart_contracts/index.ts`
- `npm run check-types` -> TypeScript type-check

## Important Operational Notes

- Normalize phone numbers off-chain before calling the contract.
- `encryptedMnemonic` is stored as provided; encryption and key management are off-chain responsibilities.
- If you call `deleteUser`, the counter is decremented; avoid duplicate delete attempts.
