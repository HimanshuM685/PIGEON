import { findOnboardedUser } from "./onchain";

const INDEXER_SERVER = "https://testnet-idx.algonode.cloud";
const EXPLORER_BASE = "https://testnet.explorer.perawallet.app/tx";

export interface TxnSummary {
  txId: string;
  type: string;
  roundTime: string;
  amount?: string;
  sender: string;
  receiver?: string;
  explorerUrl: string;
}

export interface GetTxnResult {
  success: boolean;
  address?: string;
  transactions?: TxnSummary[];
  error?: string;
}

/**
 * Fetch the last N transactions for a user's wallet via the Algorand Indexer.
 */
export async function getTransactions(
  phone: string,
  limit: number = 5
): Promise<GetTxnResult> {
  console.log("getTransactions called with phone:", phone);

  if (!phone?.trim()) return { success: false, error: "Phone number is required" };

  const user = await findOnboardedUser(phone);
  if (!user?.address) {
    return { success: false, error: "Account not found or not onboarded" };
  }

  try {
    const url = `${INDEXER_SERVER}/v2/accounts/${user.address}/transactions?limit=${limit}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Indexer error (${res.status}): ${body}` };
    }

    const json = (await res.json()) as {
      transactions?: Array<{
        id: string;
        "tx-type": string;
        "round-time": number;
        sender: string;
        "payment-transaction"?: { amount: number; receiver: string };
        "asset-transfer-transaction"?: { amount: number; receiver: string };
      }>;
    };

    const txns: TxnSummary[] = (json.transactions ?? []).map((tx) => {
      const payTx = tx["payment-transaction"];
      const assetTx = tx["asset-transfer-transaction"];
      const amountMicro = payTx?.amount ?? assetTx?.amount;
      const receiver = payTx?.receiver ?? assetTx?.receiver;

      return {
        txId: tx.id,
        type: tx["tx-type"],
        roundTime: new Date(tx["round-time"] * 1000).toISOString(),
        amount: amountMicro != null ? (amountMicro / 1_000_000).toFixed(6) : undefined,
        sender: tx.sender,
        receiver,
        explorerUrl: `${EXPLORER_BASE}/${tx.id}`,
      };
    });

    return {
      success: true,
      address: user.address,
      transactions: txns,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to fetch transactions: ${message}` };
  }
}
