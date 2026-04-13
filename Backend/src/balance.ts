import * as algosdk from "algosdk";
import { findOnboardedUser } from "./onchain";

const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const ALGOD_SERVER = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

export interface BalanceParams {
  asset?: string; // "ALGO" or asset id; we only implement ALGO for now
}

export interface BalanceResult {
  success: boolean;
  balance?: string;
  asset?: string;
  address?: string;
  error?: string;
}

/**
 * Get ALGO balance for the user's account (identified by phone).
 */
export async function getBalance(
  phone: string,
  params: BalanceParams = {}
): Promise<BalanceResult> {
  console.log("getBalance called with phone: ", phone);
  if (!phone?.trim()) return { success: false, error: "Phone is required" };

  const user = await findOnboardedUser(phone);
  if (!user?.address) {
    return { success: false, error: "Account not found or not onboarded" };
  }

  try {
    const algod = getAlgod();
    const accountInfo = await algod.accountInformation(user.address).do();

    const balanceAlgos = Number(accountInfo.amount) / 1_000_000; // Convert from microAlgos to ALGO

    return {
      success: true,
      balance: balanceAlgos.toString(),
      asset: "ALGO",
      address: user.address,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to get balance: ${message}` };
  }
}
