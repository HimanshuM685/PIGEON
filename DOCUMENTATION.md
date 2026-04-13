# PIGEON - Comprehensive Documentation

## Introduction

PIGEON is an innovative SMS-first transaction system designed to democratize access to blockchain technology and decentralize finance. By leveraging AI-driven intent processing, phone-aware routing, and threshold-signing orchestration, PIGEON allows users to interact with the Algorand Testnet directly via standard SMS messages, removing the need for smartphones, internet access, or complex wallet management.

## Core Features

1.  **SMS-First Interface**: Interact with the system entirely through text messages. No apps or internet required.
2.  **AI Intent Processing**: Natural Language Processing (NLP) via NVIDIA NIM (google/gemma-7b) interprets user messages to deduce intents like `SEND`, `RECEIVE`, `CREATE_ACCOUNT`, and `CHECK_BALANCE`.
3.  **Threshold-Signing (TSS) & DKG**: Distributed Key Generation and Threshold ECDSA ensure secure, non-custodial wallet management without relying on a single central point of failure.
4.  **Algorand Testnet Integration**: Fast, low-cost on-chain settlement and execution.
5.  **Hardware Gateway**: Utilizes ESP32 GSM modules to bridge the cellular network with the backend infrastructure.

---

## Architecture Overview

The PIGEON architecture is composed of several key components working in tandem:

### 1. The Edge (Hardware & Gateway)
*   **User Phone**: Standard mobile device capable of sending and receiving SMS.
*   **ESP32 GSM Mod**: Hardware module acting as the SMS handler. It receives incoming SMS and forwards them to the backend, and handles outgoing confirmation messages.
*   **httpSMS**: (Alternative/Supplemental) SMS gateway service.

### 2. The Brain (Backend Processing)
*   **Backend Server**: The central orchestrator for the system.
*   **AI Intent Processing Engine**: Parses raw text messages to extract the desired operation and relevant parameters (e.g., recipient phone number, amount).
*   **Phone Number Validation**: Verifies user identities and maps phone numbers to blockchain accounts.

### 3. The Vault (Security & Key Management)
*   **DKG & TSS Engine**: Manages the cryptographic keys required to sign Algorand transactions. Instead of storing a single private key, the system uses a threshold signature scheme (TSS-ECDSA) where multiple parties must collaborate to sign a transaction, ensuring no single entity has full control of user funds.

### 4. The Ledger (Blockchain)
*   **Algorand Testnet**: The underlying blockchain network where accounts are created, balances are tracked, and transactions are permanently recorded.

---

## Transaction Lifecycles

### A. Creating an Account
1.  **User** texts "Create an account" to the PIGEON number.
2.  **ESP32** receives the SMS and forwards it to the **Backend**.
3.  **AI Engine** identifies the `CREATE_ACCOUNT` intent.
4.  **Backend** validates the phone number (ensures it's not already registered).
5.  **TSS Engine** initiates DKG to generate a new Algorand wallet address for the user.
6.  **Backend** stores the mapping between the phone number and the new Algorand address.
7.  **Backend** sends a confirmation message back through the **ESP32** to the **User**: "Account created! Your balance is 0 ALGO."

### B. Sending Funds
1.  **User** texts "Send 10 ALGO to +1234567890".
2.  **ESP32** forwards the message to the **Backend**.
3.  **AI Engine** identifies the `SEND` intent, amount `10 ALGO`, and recipient `+1234567890`.
4.  **Backend** validates both the sender and recipient accounts. It checks if the sender has sufficient balance.
5.  **Backend** drafts the Algorand transaction.
6.  **TSS Engine** coordinates the signing of the transaction using the distributed key shares.
7.  **Backend** submits the signed transaction to the **Algorand Testnet**.
8.  Upon confirmation, **Backend** sends a success SMS to the **User** and a notification SMS to the **Recipient**.

### C. Checking Balance
1.  **User** texts "What is my balance?".
2.  **AI Engine** identifies the `CHECK_BALANCE` intent.
3.  **Backend** looks up the user's Algorand address.
4.  **Backend** queries the **Algorand Testnet** for the current balance.
5.  **Backend** formats the response and sends it via SMS.

---

## Detailed Component Documentation Links

For deeper technical deep-dives into specific components, please refer to the specific markdown documents located in the `Backend/docs/` directory:

*   **System Architecture & Code Mapping**: [`Backend/docs/SYSTEM_ARCHITECTURE.md`](Backend/docs/SYSTEM_ARCHITECTURE.md) - Detailed breakdown of backend services and file structures.
*   **Wallet Storage & Cryptography**: [`Backend/docs/WALLET_STORAGE.md`](Backend/docs/WALLET_STORAGE.md) - In-depth explanation of the DKG, TSS-ECDSA, and key management implementations.
*   **SMS Gateway Setup**: [`Backend/docs/sms-gateway-setup.md`](Backend/docs/sms-gateway-setup.md) / `Backend/sms-gateway-setup.md` - Instructions for configuring the ESP32 and httpSMS integrations.

## Getting Started (Development Setup)

*(To be expanded based on specific repository contents - e.g., Node.js setup, Python environments, ESP32 flashing instructions, and environment variable configuration).*
