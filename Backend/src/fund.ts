import * as algosdk from "algosdk";
import { findOnboardedUser } from "./onchain";

const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const ALGOD_SERVER = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";
const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC ?? "";

const FUND_AMOUNT_ALGO = 1;
const FUND_AMOUNT_MICRO = FUND_AMOUNT_ALGO * 1_000_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EXPLORER_BASE = "https://testnet.explorer.perawallet.app/tx";

/** In-memory rate-limit tracker: phone → last fund timestamp */
const lastFundMap = new Map<string, number>();

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

export interface FundResult {
  success: boolean;
  txId?: string;
  confirmedRound?: number;
  explorerUrl?: string;
  error?: string;
}

/**
 * Fund a user's wallet with 1 testnet ALGO from the admin wallet.
 * Limited to once per user per day.
 */
export async function fundUser(
  phone: string
): Promise<FundResult> {
  console.log("fundUser called with phone:", phone);

  if (!phone?.trim()) return { success: false, error: "Phone number is required" };

  if (!ADMIN_MNEMONIC) {
    return { success: false, error: "Admin wallet not configured on server" };
  }

  // ── Rate limit: 1 fund per user per day ──
  const normalised = phone.replace(/\D/g, "").trim() || phone;
  const lastFund = lastFundMap.get(normalised);
  if (lastFund) {
    const elapsed = Date.now() - lastFund;
    if (elapsed < ONE_DAY_MS) {
      const hoursLeft = Math.ceil((ONE_DAY_MS - elapsed) / (60 * 60 * 1000));
      return {
        success: false,
        error: `You can only be funded once per day. Try again in ~${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`,
      };
    }
  }

  // Look up user's on-chain address
  const user = await findOnboardedUser(phone);
  if (!user?.address) {
    return { success: false, error: "User not found or not onboarded. Please onboard first." };
  }

  try {
    const algod = getAlgod();
    const adminAccount = algosdk.mnemonicToSecretKey(ADMIN_MNEMONIC);
    const adminAddr = typeof adminAccount.addr === "string"
      ? adminAccount.addr
      : String(adminAccount.addr);

    // Check admin balance
    const adminInfo = await algod.accountInformation(adminAddr).do();
    const minBalance = 100_000; // 0.1 ALGO
    const totalRequired = BigInt(FUND_AMOUNT_MICRO + 1000 + minBalance);

    if (adminInfo.amount < totalRequired) {
      return {
        success: false,
        error: `Admin wallet has insufficient balance. Available: ${(Number(adminInfo.amount) / 1e6).toFixed(6)} ALGO`,
      };
    }

    const suggestedParams = await algod.getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: adminAddr,
      receiver: user.address,
      amount: FUND_AMOUNT_MICRO,
      note: new TextEncoder().encode("PIGEON Fund (TestNet)"),
      suggestedParams,
    });

    const signedTxn = txn.signTxn(adminAccount.sk);
    const txId = txn.txID().toString();
    await algod.sendRawTransaction(signedTxn).do();

    const confirmedTxn = await algosdk.waitForConfirmation(algod, txId, 10);
    const explorerUrl = `${EXPLORER_BASE}/${txId}`;

    // Record successful fund timestamp
    lastFundMap.set(normalised, Date.now());

    return {
      success: true,
      txId,
      confirmedRound: Number(confirmedTxn.confirmedRound),
      explorerUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Fund transaction failed: ${message}` };
  }
}
