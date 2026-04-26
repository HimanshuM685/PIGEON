'use strict';

var algosdk = require('algosdk');
var config = require('../config.js');
var indexer = require('./indexer.js');

var decodeSignedTransaction = algosdk.decodeSignedTransaction;
/**
 * Allows you to keep track of Algorand transaction IDs by wrapping an `Algodv2` in a proxy.
 * Useful for automated tests.
 */
class TransactionLogger {
    constructor() {
        this._sentTransactionIds = [];
    }
    _pushTxn(stxn) {
        const decoded = decodeSignedTransaction(stxn);
        if (decoded.txn.lastValid > (this._latestLastValidRound ?? BigInt(0))) {
            this._latestLastValidRound = BigInt(decoded.txn.lastValid);
        }
        this._sentTransactionIds.push(decoded.txn.txID());
    }
    /**
     * The list of transaction IDs that has been logged thus far.
     */
    get sentTransactionIds() {
        return this._sentTransactionIds;
    }
    /**
     * Clear all logged IDs.
     */
    clear() {
        this._sentTransactionIds = [];
    }
    /**
     * The method that captures raw transactions and stores the transaction IDs.
     */
    logRawTransaction(signedTransactions) {
        if (Array.isArray(signedTransactions)) {
            signedTransactions.forEach((stxn) => this._pushTxn(stxn));
        }
        else {
            this._pushTxn(signedTransactions);
        }
    }
    /** Return a proxy that wraps the given Algodv2 with this transaction logger.
     *
     * @param algod The `Algodv2` to wrap
     * @returns The wrapped `Algodv2`, any transactions sent using this algod instance will be logged by this transaction logger
     */
    capture(algod) {
        return new Proxy(algod, new TransactionLoggingAlgodv2ProxyHandler(this));
    }
    /** Wait until all logged transactions IDs appear in the given `Indexer`. */
    async waitForIndexer(indexer$1) {
        if (this._sentTransactionIds.length === 0)
            return;
        const lastTxId = this._sentTransactionIds[this._sentTransactionIds.length - 1];
        await indexer.runWhenIndexerCaughtUp(async () => {
            try {
                await indexer$1.lookupTransactionByID(lastTxId).do();
            }
            catch (e) {
                // If the txid lookup failed, then try to look up the last valid round
                // If that round exists, then we know indexer is caught up
                if (this._latestLastValidRound) {
                    await indexer$1.lookupBlock(this._latestLastValidRound).do();
                    config.Config.getLogger().debug(`waitForIndexer has waited until the last valid round ${this._latestLastValidRound} was indexed, but did not find transaction ${lastTxId} in the indexer.`);
                }
                else {
                    throw e;
                }
            }
        });
    }
}
class TransactionLoggingAlgodv2ProxyHandler {
    constructor(transactionLogger) {
        this.transactionLogger = transactionLogger;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target, property, receiver) {
        if (property === 'sendRawTransaction') {
            return (stxOrStxs) => {
                this.transactionLogger.logRawTransaction(stxOrStxs);
                return target[property].call(receiver, stxOrStxs);
            };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return target[property];
    }
}

exports.TransactionLogger = TransactionLogger;
//# sourceMappingURL=transaction-logger.js.map
