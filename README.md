# PIGEON

Algorand smart-contract workspace for the PIGEON onboarding flow.

## What this contract does

The `ContractPigeon` contract stores onboarded users on-chain using Algorand boxes.

- **Admin-controlled writes**: only the app creator can add, update, or delete users.
- **Phone-keyed storage**: each record is stored by normalized phone number.
- **Structured user data**: address, encrypted mnemonic, and onboarding timestamp.
- **Lightweight reads**: query full user record, existence, address, and total count.

## Contract location

- Contract source: `pigeon-contract/projects/pigeon-contract/smart_contracts/hello_world/contract.algo.ts`
- Deployer: `pigeon-contract/projects/pigeon-contract/smart_contracts/hello_world/deploy-config.ts`

## Quick start

From `pigeon-contract/projects/pigeon-contract`:

```bash
npm install
algokit generate env-file -a target_network localnet
algokit localnet start
npm run build
npm run deploy -- hello_world
```

## Documentation

Detailed contract API and data-model documentation:

- `pigeon-contract/projects/pigeon-contract/README.md`
