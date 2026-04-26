'use strict';

var algosdk = require('algosdk');

var modelsv2 = algosdk.modelsv2;
/**
 * Performs a simulation of the transactions loaded into the given AtomicTransactionComposer.
 * Uses empty transaction signers for all transactions.
 *
 * @param atc The AtomicTransactionComposer with transaction(s) loaded.
 * @param algod An Algod client to perform the simulation.
 * @returns The simulation result, which includes various details about how the transactions would be processed.
 */
async function performAtomicTransactionComposerSimulate(atc, algod, options) {
    const unsignedTransactionsSigners = atc.buildGroup();
    const decodedSignedTransactions = unsignedTransactionsSigners.map((ts) => algosdk.encodeUnsignedSimulateTransaction(ts.txn));
    const simulateRequest = new modelsv2.SimulateRequest({
        ...(options ?? {
            allowEmptySignatures: true,
            fixSigners: true,
            allowMoreLogging: true,
            execTraceConfig: new modelsv2.SimulateTraceConfig({
                enable: true,
                scratchChange: true,
                stackChange: true,
                stateChange: true,
            }),
        }),
        txnGroups: [
            new modelsv2.SimulateRequestTransactionGroup({
                txns: decodedSignedTransactions.map((txn) => algosdk.decodeMsgpack(txn, algosdk.SignedTransaction)),
            }),
        ],
    });
    const simulateResult = await algod.simulateTransactions(simulateRequest).do();
    return simulateResult;
}

exports.performAtomicTransactionComposerSimulate = performAtomicTransactionComposerSimulate;
//# sourceMappingURL=perform-atomic-transaction-composer-simulate.js.map
