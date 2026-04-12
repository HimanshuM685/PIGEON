# PIGEON

PIGEON is an Algorand + ESP32/SIM800L SMS system.

It has two main parts:

- `ContractPigeon` smart contract on Algorand TestNet
- ESP32 + SIM800L firmware that receives SMS and reads contract data from chain

## What the contract does

The `ContractPigeon` contract stores onboarded users on-chain using Algorand boxes.

- **Admin-controlled writes**: only the app creator can add, update, or delete users.
- **Phone-keyed storage**: each record is stored by normalized phone number.
- **Structured user data**: address, encrypted mnemonic, and onboarding timestamp.
- **Lightweight reads**: query full user record, existence, address, and total count.

Contract source and deploy files:

- Contract source: `pigeon-contract/projects/pigeon-contract/smart_contracts/hello_world/contract.algo.ts`
- Deployer: `pigeon-contract/projects/pigeon-contract/smart_contracts/hello_world/deploy-config.ts`

## What ESP32 + SIM800L does

Firmware file:

- `esp32 logic/esp32_sms_algod_testnet.ino`

Behavior:

- SIM800L receives incoming SMS commands.
- ESP32 connects to WiFi and calls Algorand TestNet RPC (`testnet-api.4160.nodely.dev`).
- ESP32 reads contract global state and box data for a selected App ID.
- ESP32 replies back by SMS with the query result.
- Device is read-only for contract interaction and does not hold admin keys.

Supported SMS commands:

- `APPID <id>` set target smart contract app id
- `APPID` show current app id
- `STATUS` check Algod node status
- `TOTAL` read `totalUsers` global state
- `EXISTS <phone>` check if user box exists (`u<phone>`)
- `ADDR <phone>` read user Algorand address
- `USER <phone>` read user address and `createdAt`

## How they work together

- Admin onboarding flow writes users into `ContractPigeon`.
- SIM800L users send SMS queries to the ESP32 device.
- ESP32 reads the same on-chain contract data and returns results by SMS.

## Contract quick start

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
