'use strict';

var algosdk = require('algosdk');
var types_algorandClientTransactionCreator = require('../types/algorand-client-transaction-creator.js');
var types_algorandClientTransactionSender = require('../types/algorand-client-transaction-sender.js');
var types_appManager = require('../types/app-manager.js');
var types_assetManager = require('../types/asset-manager.js');
var types_composer = require('../types/composer.js');
var transaction = require('./transaction.js');

var ABIMethod = algosdk.ABIMethod;
/** @deprecated Bridges between legacy `sendTransaction` behaviour and new `AlgorandClient` behaviour. */
async function legacySendTransactionBridge(algod, from, sendParams, params, txn, send, suggestedParams) {
    const appManager = new types_appManager.AppManager(algod);
    const newGroup = () => new types_composer.TransactionComposer({
        algod,
        getSigner: () => transaction.getSenderTransactionSigner(from),
        getSuggestedParams: async () => (suggestedParams ? { ...suggestedParams } : await algod.getTransactionParams().do()),
        appManager,
    });
    const transactionSender = new types_algorandClientTransactionSender.AlgorandClientTransactionSender(newGroup, new types_assetManager.AssetManager(algod, newGroup), appManager);
    const transactionCreator = new types_algorandClientTransactionCreator.AlgorandClientTransactionCreator(newGroup);
    if (sendParams.fee) {
        params.staticFee = sendParams.fee;
    }
    if (sendParams.maxFee) {
        params.maxFee = sendParams.maxFee;
    }
    if (sendParams.atc || sendParams.skipSending) {
        const transaction$1 = await txn(transactionCreator)(params);
        const txns = 'transactions' in transaction$1 ? transaction$1.transactions : [transaction$1];
        if (sendParams.atc) {
            const baseIndex = sendParams.atc.count();
            txns
                .map((txn, i) => ({
                txn,
                signer: 'signers' in transaction$1 ? (transaction$1.signers.get(i) ?? transaction.getSenderTransactionSigner(from)) : transaction.getSenderTransactionSigner(from),
            }))
                .forEach((t) => sendParams.atc.addTransaction(t));
            // Populate ATC with method calls
            if ('transactions' in transaction$1) {
                transaction$1.methodCalls.forEach((m, i) => sendParams.atc['methodCalls'].set(i + baseIndex, m));
            }
        }
        return { transaction: txns.at(-1), transactions: txns };
    }
    return { ...(await send(transactionSender)({ ...sendParams, ...params })) };
}
/** @deprecated Bridges between legacy `sendTransaction` behaviour for app transactions and new `AlgorandClient` behaviour. */
async function legacySendAppTransactionBridge(algod, from, appArgs, sendParams, params, txn, send, suggestedParams) {
    const encoder = new TextEncoder();
    const paramsWithAppArgs = {
        ...params,
        accountReferences: appArgs?.accounts?.map((a) => (typeof a === 'string' ? a : algosdk.encodeAddress(a.publicKey))),
        appReferences: appArgs?.apps?.map((a) => BigInt(a)),
        assetReferences: appArgs?.assets?.map((a) => BigInt(a)),
        boxReferences: appArgs?.boxes?.map(_getBoxReference)?.map((r) => ({ appId: BigInt(r.appIndex), name: r.name })),
        lease: appArgs?.lease,
        rekeyTo: appArgs?.rekeyTo ? transaction.getSenderAddress(appArgs?.rekeyTo) : undefined,
        args: appArgs
            ? 'methodArgs' in appArgs
                ? (await _getAppArgsForABICall(appArgs, from)).methodArgs
                : appArgs?.appArgs?.map((a) => (typeof a === 'string' ? encoder.encode(a) : a))
            : undefined,
        note: transaction.encodeTransactionNote(sendParams?.note),
    };
    return await legacySendTransactionBridge(algod, from, sendParams, paramsWithAppArgs, txn, send, suggestedParams);
}
/**
 * @deprecated
 */
async function _getAppArgsForABICall(args, from) {
    const signer = transaction.getSenderTransactionSigner(from);
    const methodArgs = await Promise.all(('methodArgs' in args ? args.methodArgs : args)?.map(async (a, index) => {
        if (a === undefined) {
            throw new Error(`Argument at position ${index} does not have a value`);
        }
        if (typeof a !== 'object') {
            return a;
        }
        // Handle the various forms of transactions to wrangle them for ATC
        return 'txn' in a
            ? a
            : a instanceof Promise
                ? { txn: (await a).transaction, signer }
                : 'transaction' in a
                    ? { txn: a.transaction, signer: 'signer' in a ? transaction.getSenderTransactionSigner(a.signer) : signer }
                    : 'txID' in a
                        ? { txn: a, signer }
                        : a;
    }));
    return {
        method: 'txnCount' in args.method ? args.method : new ABIMethod(args.method),
        sender: transaction.getSenderAddress(from),
        signer: signer,
        boxes: args.boxes?.map(_getBoxReference),
        lease: transaction.encodeLease(args.lease),
        appForeignApps: args.apps,
        appForeignAssets: args.assets,
        appAccounts: args.accounts?.map(_getAccountAddress),
        methodArgs: methodArgs,
        rekeyTo: args?.rekeyTo ? (typeof args.rekeyTo === 'string' ? args.rekeyTo : transaction.getSenderAddress(args.rekeyTo)) : undefined,
    };
}
function _getAccountAddress(account) {
    return typeof account === 'string' ? account : algosdk.encodeAddress(account.publicKey);
}
/** @deprecated */
function _getBoxReference(box) {
    const encoder = new TextEncoder();
    if (typeof box === 'object' && 'appIndex' in box) {
        return box;
    }
    const ref = typeof box === 'object' && 'appId' in box ? box : { appId: 0, name: box };
    return {
        appIndex: ref.appId,
        name: typeof ref.name === 'string'
            ? encoder.encode(ref.name)
            : 'length' in ref.name
                ? ref.name
                : algosdk.decodeAddress(transaction.getSenderAddress(ref.name)).publicKey,
    };
}

exports._getAppArgsForABICall = _getAppArgsForABICall;
exports._getBoxReference = _getBoxReference;
exports.legacySendAppTransactionBridge = legacySendAppTransactionBridge;
exports.legacySendTransactionBridge = legacySendTransactionBridge;
//# sourceMappingURL=legacy-bridge.js.map
