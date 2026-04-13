/**
 * On-chain data layer — replaces SQLite (db.ts).
 *
 * All user data is stored on the Algorand blockchain via the ContractPigeon
 * smart contract using Box Storage.  The password is NEVER stored; only the
 * AES-256-GCM encrypted mnemonic goes on-chain.
 */

import "dotenv/config";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { ContractPigeonClient } from "./contract/ContractPigeonClient";
import * as algosdk from "algosdk";

// ─── Environment ────────────────────────────────────────────────────────────

const ALGOD_SERVER =
    process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";

const PIGEON_APP_ID = BigInt(process.env.PIGEON_APP_ID ?? "0");
const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC ?? "";

// ─── Singletons ─────────────────────────────────────────────────────────────

let _algorand: AlgorandClient | null = null;
let _appClient: ContractPigeonClient | null = null;

function getAlgorand(): AlgorandClient {
    if (!_algorand) {
        _algorand = AlgorandClient.fromConfig({
            algodConfig: {
                server: ALGOD_SERVER,
                token: ALGOD_TOKEN,
                port: ALGOD_PORT ? Number(ALGOD_PORT) : undefined,
            },
        });
    }
    return _algorand;
}

function getAdminAccount(): { addr: string; signer: algosdk.TransactionSigner } {
    if (!ADMIN_MNEMONIC) {
        throw new Error(
            "ADMIN_MNEMONIC is not set — cannot interact with the on-chain contract"
        );
    }
    const account = algosdk.mnemonicToSecretKey(ADMIN_MNEMONIC);
    const addr = typeof account.addr === "string" ? account.addr : String(account.addr);

    // Register the account with AlgorandClient so it can sign transactions
    const algorand = getAlgorand();
    algorand.setSignerFromAccount(account);

    return {
        addr,
        signer: algosdk.makeBasicAccountTransactionSigner(account),
    };
}

function getAppClient(): ContractPigeonClient {
    if (!_appClient) {
        if (!PIGEON_APP_ID || PIGEON_APP_ID === 0n) {
            throw new Error(
                "PIGEON_APP_ID is not set — deploy the ContractPigeon first and set the app ID"
            );
        }
        const admin = getAdminAccount();
        _appClient = new ContractPigeonClient({
            algorand: getAlgorand(),
            appId: PIGEON_APP_ID,
            defaultSender: admin.addr,
            defaultSigner: admin.signer,
        });
    }
    return _appClient;
}

// ─── Public interface (same shape as old db.ts) ─────────────────────────────

export interface OnboardedUser {
    phone: string;
    address: string | null;
    encrypted_mnemonic: string | null;
    created_at: number;
}

/**
 * Look up a user on-chain by phone number.
 * Returns null if not found (mirrors old `findOnboardedUser`).
 */
export async function findOnboardedUser(
    phone: string
): Promise<OnboardedUser | null> {
    const normalised = normalizePhone(phone);
    const client = getAppClient();

    try {
        // First check if the user exists to avoid a revert
        const existsResult = await client.send.userExists({
            args: { phone: normalised },
        });
        if (!existsResult.return) {
            return null;
        }

        const result = await client.send.getUser({
            args: { phone: normalised },
        });

        if (!result.return) return null;

        const userData = result.return;
        return {
            phone: normalised,
            address: userData.address || null,
            encrypted_mnemonic: userData.encryptedMnemonic || null,
            created_at: Number(userData.createdAt),
        };
    } catch (err) {
        // If the box doesn't exist the contract will revert — treat as "not found"
        console.warn("findOnboardedUser on-chain error (treating as not found):", err);
        return null;
    }
}

/**
 * Store a new user on-chain.
 * Mirrors old `insertOnboardedUser`.
 *
 * The caller must ensure the app account has enough balance to cover the
 * new Box's MBR (Minimum Balance Requirement).
 */
export async function insertOnboardedUser(
    phone: string,
    address: string,
    encryptedMnemonic: string
): Promise<void> {
    const normalised = normalizePhone(phone);
    const client = getAppClient();

    await client.send.onboardUser({
        args: {
            phone: normalised,
            address: String(address ?? ""),
            encryptedMnemonic: String(encryptedMnemonic ?? ""),
            createdAt: BigInt(Math.floor(Date.now() / 1000)),
        },
        boxReferences: [
            { appId: PIGEON_APP_ID, name: new TextEncoder().encode("u" + normalised) },
        ],
        populateAppCallResources: true,
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").trim() || phone;
}
