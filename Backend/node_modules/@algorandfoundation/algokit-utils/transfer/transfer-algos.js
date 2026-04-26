'use strict';

var legacyBridge = require('../transaction/legacy-bridge.js');
var transaction = require('../transaction/transaction.js');

/**
 * @deprecated Use `algorand.send.payment()` / `algorand.createTransaction.payment()` instead
 *
 * Transfer Algo between two accounts.
 * @param transfer The transfer definition
 * @param algod An algod client
 * @returns The transaction object and optionally the confirmation if it was sent to the chain (`skipSending` is `false` or unset)
 *
 * @example Usage example
 * ```typescript
 * await algokit.transferAlgos({ from, to, amount: algokit.algo(1) }, algod)
 * ```
 */
async function transferAlgos(transfer, algod) {
    const params = {
        sender: transaction.getSenderAddress(transfer.from),
        receiver: transaction.getSenderAddress(transfer.to),
        amount: transfer.amount,
        note: transaction.encodeTransactionNote(transfer.note),
        lease: transfer.lease,
    };
    return await legacyBridge.legacySendTransactionBridge(algod, transfer.from, transfer, params, (c) => c.payment, (c) => c.payment);
}

exports.transferAlgos = transferAlgos;
//# sourceMappingURL=transfer-algos.js.map
