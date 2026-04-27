"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = getTransactions;
const onchain_1 = require("./onchain");
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud";
const EXPLORER_BASE = "https://testnet.explorer.perawallet.app/tx";
/**
 * Fetch the last N transactions for a user's wallet via the Algorand Indexer.
 */
async function getTransactions(phone, limit = 5) {
    console.log("getTransactions called with phone:", phone);
    if (!phone?.trim())
        return { success: false, error: "Phone number is required" };
    const user = await (0, onchain_1.findOnboardedUser)(phone);
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
        const json = (await res.json());
        const txns = (json.transactions ?? []).map((tx) => {
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Failed to fetch transactions: ${message}` };
    }
}
