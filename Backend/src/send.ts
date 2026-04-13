import * as algosdk from "algosdk";
import { findOnboardedUser } from "./onchain";
import { decryptMnemonic } from "./crypto/mnemonic";

const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const ALGOD_SERVER = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

export interface SendParams {
  amount: string; // in ALGO (will be converted to microAlgos)
  asset?: string; // "ALGO" or asset id; we only implement ALGO for now
  to: string;    // recipient address or identifier (we treat as address for ALGO)
}

export interface SendResult {
  success: boolean;
  txId?: string;
  confirmedRound?: number;
  error?: string;
}

const MICROALGOS_PER_ALGO = 1_000_000;

/**
 * Send ALGO from the user's account (identified by phone) to a recipient.
 * Requires the user's password to decrypt the mnemonic and sign the transaction.
 */
export async function sendAlgo(
  phone: string,
  password: string,
  params: SendParams
): Promise<SendResult> {
  console.log("sendAlgo called with phone: ", phone);
  if (!phone?.trim()) return { success: false, error: "Phone (from) is required" };
  if (!password?.trim()) return { success: false, error: "Password is required to send (decrypt wallet)" };
  if (!params.to?.trim()) return { success: false, error: "Recipient (to) is required" };

  const amountAlgo = parseFloat(params.amount);
  if (Number.isNaN(amountAlgo) || amountAlgo <= 0) {
    return { success: false, error: "Invalid amount" };
  }
  const amountMicroAlgos = Math.floor(amountAlgo * MICROALGOS_PER_ALGO);
  let toAddress = params.to.trim();

  // First check if it's a valid Algorand address
  if (algosdk.isValidAddress(toAddress)) {
    // It's a valid address, use it directly
  } else {
    // It's not a valid address, treat it as a destination/phone number and search on-chain
    const toUser = await findOnboardedUser(toAddress);
    if (toUser?.address) {
      toAddress = toUser.address;
    } else {
      return {
        success: false,
        error: `Invalid recipient "${params.to}". Use a valid Algorand address or an onboarded phone number.`
      };
    }
  }

  const user = await findOnboardedUser(phone);
  if (!user?.encrypted_mnemonic || !user?.address) {
    return { success: false, error: "Account not found or not onboarded with password-protected wallet" };
  }

  let sk: Uint8Array;
  try {
    const mnemonic = decryptMnemonic(user.encrypted_mnemonic, password);
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    sk = account.sk;
    if (account.addr.toString() !== user.address) {
      return { success: false, error: "Wallet address mismatch" };
    }
  } catch {
    return { success: false, error: "Wrong password (decrypt failed)" };
  }

  try {
    const algod = getAlgod();

    // Check sender balance before transaction
    const senderInfo = await algod.accountInformation(user.address).do();
    const minBalance = 100000; // 0.1 ALGO minimum balance
    const totalRequired = BigInt(amountMicroAlgos + 1000 + minBalance); // amount + fee + min balance

    if (senderInfo.amount < totalRequired) {
      return {
        success: false,
        error: `Insufficient balance. Required: ${((Number(totalRequired) / 1_000_000).toFixed(6))} ALGO (includes 0.1 ALGO minimum), Available: ${(Number(senderInfo.amount) / 1e6).toFixed(6)} ALGO. Fund your account at: https://bank.testnet.algorand.network/`
      };
    }

    const suggestedParams = await algod.getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: user.address,
      receiver: toAddress,
      amount: amountMicroAlgos,
      note: new TextEncoder().encode("SMS Wallet Transfer"),
      suggestedParams,
    });
    const signedTxn = txn.signTxn(sk);
    const txId = txn.txID().toString();
    await algod.sendRawTransaction(signedTxn).do();

    // Wait for transaction confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algod, txId, 10);

    return {
      success: true,
      txId,
      confirmedRound: Number(confirmedTxn.confirmedRound)
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Transaction failed: ${message}` };
  }
}
