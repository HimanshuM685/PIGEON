import { ABIAddressType, abiCheckTransactionType, ABIReferenceType, ABITupleType, abiTypeIsReference, abiTypeIsTransaction, ABIUintType, } from './abi/index.js';
import { SimulateRequest, SimulateRequestTransactionGroup, } from './client/v2/algod/models/types.js';
import * as encoding from './encoding/encoding.js';
import { assignGroupID } from './group.js';
import { makeApplicationCallTxnFromObject } from './makeTxn.js';
import { isTransactionWithSigner, } from './signer.js';
import { Transaction } from './transaction.js';
import { SignedTransaction } from './signedTransaction.js';
import { OnApplicationComplete, } from './types/transactions/base.js';
import { arrayEqual, stringifyJSON, ensureUint64 } from './utils/utils.js';
import { waitForConfirmation } from './wait.js';
// First 4 bytes of SHA-512/256 hash of "return"
const RETURN_PREFIX = new Uint8Array([21, 31, 124, 117]);
// The maximum number of arguments for an application call transaction
const MAX_APP_ARGS = 16;
export var AtomicTransactionComposerStatus;
(function (AtomicTransactionComposerStatus) {
    /** The atomic group is still under construction. */
    AtomicTransactionComposerStatus[AtomicTransactionComposerStatus["BUILDING"] = 0] = "BUILDING";
    /** The atomic group has been finalized, but not yet signed. */
    AtomicTransactionComposerStatus[AtomicTransactionComposerStatus["BUILT"] = 1] = "BUILT";
    /** The atomic group has been finalized and signed, but not yet submitted to the network. */
    AtomicTransactionComposerStatus[AtomicTransactionComposerStatus["SIGNED"] = 2] = "SIGNED";
    /** The atomic group has been finalized, signed, and submitted to the network. */
    AtomicTransactionComposerStatus[AtomicTransactionComposerStatus["SUBMITTED"] = 3] = "SUBMITTED";
    /** The atomic group has been finalized, signed, submitted, and successfully committed to a block. */
    AtomicTransactionComposerStatus[AtomicTransactionComposerStatus["COMMITTED"] = 4] = "COMMITTED";
})(AtomicTransactionComposerStatus || (AtomicTransactionComposerStatus = {}));
/**
 * Add a value to an application call's foreign array. The addition will be as compact as possible,
 * and this function will return an index that can be used to reference `valueToAdd` in `array`.
 *
 * @param valueToAdd - The value to add to the array. If this value is already present in the array,
 *   it will not be added again. Instead, the existing index will be returned.
 * @param array - The existing foreign array. This input may be modified to append `valueToAdd`.
 * @param zeroValue - If provided, this value indicated two things: the 0 value is special for this
 *   array, so all indexes into `array` must start at 1; additionally, if `valueToAdd` equals
 *   `zeroValue`, then `valueToAdd` will not be added to the array, and instead the 0 indexes will
 *   be returned.
 * @returns An index that can be used to reference `valueToAdd` in `array`.
 */
function populateForeignArray(valueToAdd, array, zeroValue) {
    if (zeroValue != null && valueToAdd === zeroValue) {
        return 0;
    }
    const offset = zeroValue == null ? 0 : 1;
    for (let i = 0; i < array.length; i++) {
        if (valueToAdd === array[i]) {
            return i + offset;
        }
    }
    array.push(valueToAdd);
    return array.length - 1 + offset;
}
/** A class used to construct and execute atomic transaction groups */
export class AtomicTransactionComposer {
    constructor() {
        this.status = AtomicTransactionComposerStatus.BUILDING;
        this.transactions = [];
        this.methodCalls = new Map();
        this.signedTxns = [];
        this.txIDs = [];
    }
    /**
     * Get the status of this composer's transaction group.
     */
    getStatus() {
        return this.status;
    }
    /**
     * Get the number of transactions currently in this atomic group.
     */
    count() {
        return this.transactions.length;
    }
    /**
     * Create a new composer with the same underlying transactions. The new composer's status will be
     * BUILDING, so additional transactions may be added to it.
     */
    clone() {
        const theClone = new AtomicTransactionComposer();
        theClone.transactions = this.transactions.map(({ txn, signer }) => {
            const txnMap = txn.toEncodingData();
            // erase the group ID
            txnMap.delete('grp');
            return {
                // not quite a deep copy, but good enough for our purposes (modifying txn.group in buildGroup)
                txn: Transaction.fromEncodingData(txnMap),
                signer,
            };
        });
        theClone.methodCalls = new Map(this.methodCalls);
        return theClone;
    }
    /**
     * Add a transaction to this atomic group.
     *
     * An error will be thrown if the transaction has a nonzero group ID, the composer's status is
     * not BUILDING, or if adding this transaction causes the current group to exceed MAX_GROUP_SIZE.
     */
    addTransaction(txnAndSigner) {
        if (this.status !== AtomicTransactionComposerStatus.BUILDING) {
            throw new Error('Cannot add transactions when composer status is not BUILDING');
        }
        if (this.transactions.length === AtomicTransactionComposer.MAX_GROUP_SIZE) {
            throw new Error(`Adding an additional transaction exceeds the maximum atomic group size of ${AtomicTransactionComposer.MAX_GROUP_SIZE}`);
        }
        if (txnAndSigner.txn.group && txnAndSigner.txn.group.some((v) => v !== 0)) {
            throw new Error('Cannot add a transaction with nonzero group ID');
        }
        this.transactions.push(txnAndSigner);
    }
    /**
     * Add a smart contract method call to this atomic group.
     *
     * An error will be thrown if the composer's status is not BUILDING, if adding this transaction
     * causes the current group to exceed MAX_GROUP_SIZE, or if the provided arguments are invalid
     * for the given method.
     */
    addMethodCall({ appID, method, methodArgs, sender, suggestedParams, onComplete, approvalProgram, clearProgram, numGlobalInts, numGlobalByteSlices, numLocalInts, numLocalByteSlices, extraPages, appAccounts, appForeignApps, appForeignAssets, boxes, access, note, lease, rekeyTo, rejectVersion, signer, }) {
        if (this.status !== AtomicTransactionComposerStatus.BUILDING) {
            throw new Error('Cannot add transactions when composer status is not BUILDING');
        }
        if (this.transactions.length + method.txnCount() >
            AtomicTransactionComposer.MAX_GROUP_SIZE) {
            throw new Error(`Adding additional transactions exceeds the maximum atomic group size of ${AtomicTransactionComposer.MAX_GROUP_SIZE}`);
        }
        if (BigInt(appID) === BigInt(0)) {
            if (approvalProgram == null ||
                clearProgram == null ||
                numGlobalInts == null ||
                numGlobalByteSlices == null ||
                numLocalInts == null ||
                numLocalByteSlices == null) {
                throw new Error('One of the following required parameters for application creation is missing: approvalProgram, clearProgram, numGlobalInts, numGlobalByteSlices, numLocalInts, numLocalByteSlices');
            }
        }
        else if (onComplete === OnApplicationComplete.UpdateApplicationOC) {
            if (approvalProgram == null || clearProgram == null) {
                throw new Error('One of the following required parameters for OnApplicationComplete.UpdateApplicationOC is missing: approvalProgram, clearProgram');
            }
            if (numGlobalInts != null ||
                numGlobalByteSlices != null ||
                numLocalInts != null ||
                numLocalByteSlices != null ||
                extraPages != null) {
                throw new Error('One of the following application creation parameters were set on a non-creation call: numGlobalInts, numGlobalByteSlices, numLocalInts, numLocalByteSlices, extraPages');
            }
        }
        else if (approvalProgram != null ||
            clearProgram != null ||
            numGlobalInts != null ||
            numGlobalByteSlices != null ||
            numLocalInts != null ||
            numLocalByteSlices != null ||
            extraPages != null) {
            throw new Error('One of the following application creation parameters were set on a non-creation call: approvalProgram, clearProgram, numGlobalInts, numGlobalByteSlices, numLocalInts, numLocalByteSlices, extraPages');
        }
        // Validate that access and legacy foreign arrays are not both specified
        if (access &&
            (appAccounts || appForeignApps || appForeignAssets || boxes)) {
            throw new Error('Cannot specify both access and legacy foreign arrays (appAccounts, appForeignApps, appForeignAssets, boxes)');
        }
        if (methodArgs == null) {
            // eslint-disable-next-line no-param-reassign
            methodArgs = [];
        }
        if (methodArgs.length !== method.args.length) {
            throw new Error(`Incorrect number of method arguments. Expected ${method.args.length}, got ${methodArgs.length}`);
        }
        let basicArgTypes = [];
        let basicArgValues = [];
        const txnArgs = [];
        const refArgTypes = [];
        const refArgValues = [];
        const refArgIndexToBasicArgIndex = new Map();
        // TODO: Box encoding for ABI
        const boxReferences = !boxes ? [] : boxes;
        for (let i = 0; i < methodArgs.length; i++) {
            let argType = method.args[i].type;
            const argValue = methodArgs[i];
            if (abiTypeIsTransaction(argType)) {
                if (!isTransactionWithSigner(argValue) ||
                    !abiCheckTransactionType(argType, argValue.txn)) {
                    throw new Error(`Expected ${argType} TransactionWithSigner for argument at index ${i}`);
                }
                if (argValue.txn.group && argValue.txn.group.some((v) => v !== 0)) {
                    throw new Error('Cannot add a transaction with nonzero group ID');
                }
                txnArgs.push(argValue);
                continue;
            }
            if (isTransactionWithSigner(argValue)) {
                throw new Error(`Expected non-transaction value for argument at index ${i}`);
            }
            if (abiTypeIsReference(argType)) {
                refArgIndexToBasicArgIndex.set(refArgTypes.length, basicArgTypes.length);
                refArgTypes.push(argType);
                refArgValues.push(argValue);
                // treat the reference as a uint8 for encoding purposes
                argType = new ABIUintType(8);
            }
            if (typeof argType === 'string') {
                throw new Error(`Unknown ABI type: ${argType}`);
            }
            basicArgTypes.push(argType);
            basicArgValues.push(argValue);
        }
        const resolvedRefIndexes = [];
        // Converting addresses to string form for easier comparison
        const foreignAccounts = appAccounts == null ? [] : appAccounts.map((addr) => addr.toString());
        const foreignApps = appForeignApps == null ? [] : appForeignApps.map(ensureUint64);
        const foreignAssets = appForeignAssets == null ? [] : appForeignAssets.map(ensureUint64);
        for (let i = 0; i < refArgTypes.length; i++) {
            const refType = refArgTypes[i];
            const refValue = refArgValues[i];
            let resolved = 0;
            switch (refType) {
                case ABIReferenceType.account: {
                    const addressType = new ABIAddressType();
                    const address = addressType.decode(addressType.encode(refValue));
                    resolved = populateForeignArray(address, foreignAccounts, sender.toString());
                    break;
                }
                case ABIReferenceType.application: {
                    const uint64Type = new ABIUintType(64);
                    const refAppID = uint64Type.decode(uint64Type.encode(refValue));
                    if (refAppID > Number.MAX_SAFE_INTEGER) {
                        throw new Error(`Expected safe integer for application value, got ${refAppID}`);
                    }
                    resolved = populateForeignArray(refAppID, foreignApps, ensureUint64(appID));
                    break;
                }
                case ABIReferenceType.asset: {
                    const uint64Type = new ABIUintType(64);
                    const refAssetID = uint64Type.decode(uint64Type.encode(refValue));
                    if (refAssetID > Number.MAX_SAFE_INTEGER) {
                        throw new Error(`Expected safe integer for asset value, got ${refAssetID}`);
                    }
                    resolved = populateForeignArray(refAssetID, foreignAssets);
                    break;
                }
                default:
                    throw new Error(`Unknown reference type: ${refType}`);
            }
            resolvedRefIndexes.push(resolved);
        }
        for (let i = 0; i < resolvedRefIndexes.length; i++) {
            const basicArgIndex = refArgIndexToBasicArgIndex.get(i);
            basicArgValues[basicArgIndex] = resolvedRefIndexes[i];
        }
        if (basicArgTypes.length > MAX_APP_ARGS - 1) {
            const lastArgTupleTypes = basicArgTypes.slice(MAX_APP_ARGS - 2);
            const lastArgTupleValues = basicArgValues.slice(MAX_APP_ARGS - 2);
            basicArgTypes = basicArgTypes.slice(0, MAX_APP_ARGS - 2);
            basicArgValues = basicArgValues.slice(0, MAX_APP_ARGS - 2);
            basicArgTypes.push(new ABITupleType(lastArgTupleTypes));
            basicArgValues.push(lastArgTupleValues);
        }
        const appArgsEncoded = [method.getSelector()];
        for (let i = 0; i < basicArgTypes.length; i++) {
            appArgsEncoded.push(basicArgTypes[i].encode(basicArgValues[i]));
        }
        const appCall = {
            txn: makeApplicationCallTxnFromObject({
                sender,
                appIndex: appID,
                appArgs: appArgsEncoded,
                // Only pass legacy foreign arrays if access is not provided
                accounts: access ? undefined : foreignAccounts,
                foreignApps: access ? undefined : foreignApps,
                foreignAssets: access ? undefined : foreignAssets,
                boxes: access ? undefined : boxReferences,
                access,
                onComplete: onComplete == null ? OnApplicationComplete.NoOpOC : onComplete,
                approvalProgram,
                clearProgram,
                numGlobalInts,
                numGlobalByteSlices,
                numLocalInts,
                numLocalByteSlices,
                extraPages,
                rejectVersion,
                lease,
                note,
                rekeyTo,
                suggestedParams,
            }),
            signer,
        };
        this.transactions.push(...txnArgs, appCall);
        this.methodCalls.set(this.transactions.length - 1, method);
    }
    /**
     * Finalize the transaction group and returned the finalized transactions.
     *
     * The composer's status will be at least BUILT after executing this method.
     */
    buildGroup() {
        if (this.status === AtomicTransactionComposerStatus.BUILDING) {
            if (this.transactions.length === 0) {
                throw new Error('Cannot build a group with 0 transactions');
            }
            if (this.transactions.length > 1) {
                assignGroupID(this.transactions.map((txnWithSigner) => txnWithSigner.txn));
            }
            this.status = AtomicTransactionComposerStatus.BUILT;
        }
        return this.transactions;
    }
    /**
     * Obtain signatures for each transaction in this group. If signatures have already been obtained,
     * this method will return cached versions of the signatures.
     *
     * The composer's status will be at least SIGNED after executing this method.
     *
     * An error will be thrown if signing any of the transactions fails.
     *
     * @returns A promise that resolves to an array of signed transactions.
     */
    async gatherSignatures() {
        if (this.status >= AtomicTransactionComposerStatus.SIGNED) {
            return this.signedTxns;
        }
        // retrieve built transactions and verify status is BUILT
        const txnsWithSigners = this.buildGroup();
        const txnGroup = txnsWithSigners.map((txnWithSigner) => txnWithSigner.txn);
        const indexesPerSigner = new Map();
        for (let i = 0; i < txnsWithSigners.length; i++) {
            const { signer } = txnsWithSigners[i];
            if (!indexesPerSigner.has(signer)) {
                indexesPerSigner.set(signer, []);
            }
            indexesPerSigner.get(signer).push(i);
        }
        const orderedSigners = Array.from(indexesPerSigner);
        const batchedSigs = await Promise.all(orderedSigners.map(([signer, indexes]) => signer(txnGroup, indexes)));
        const signedTxns = txnsWithSigners.map(() => null);
        for (let signerIndex = 0; signerIndex < orderedSigners.length; signerIndex++) {
            const indexes = orderedSigners[signerIndex][1];
            const sigs = batchedSigs[signerIndex];
            for (let i = 0; i < indexes.length; i++) {
                signedTxns[indexes[i]] = sigs[i];
            }
        }
        function fullyPopulated(a) {
            return a.every((v) => v != null);
        }
        if (!fullyPopulated(signedTxns)) {
            throw new Error(`Missing signatures. Got ${signedTxns}`);
        }
        const txIDs = signedTxns.map((stxn, index) => {
            try {
                return encoding.decodeMsgpack(stxn, SignedTransaction).txn.txID();
            }
            catch (err) {
                throw new Error(`Cannot decode signed transaction at index ${index}. ${err}`);
            }
        });
        this.signedTxns = signedTxns;
        this.txIDs = txIDs;
        this.status = AtomicTransactionComposerStatus.SIGNED;
        return signedTxns;
    }
    /**
     * Send the transaction group to the network, but don't wait for it to be committed to a block. An
     * error will be thrown if submission fails.
     *
     * The composer's status must be SUBMITTED or lower before calling this method. If submission is
     * successful, this composer's status will update to SUBMITTED.
     *
     * Note: a group can only be submitted again if it fails.
     *
     * @param client - An Algodv2 client
     *
     * @returns A promise that, upon success, resolves to a list of TxIDs of the submitted transactions.
     */
    async submit(client) {
        if (this.status > AtomicTransactionComposerStatus.SUBMITTED) {
            throw new Error('Transaction group cannot be resubmitted');
        }
        const stxns = await this.gatherSignatures();
        await client.sendRawTransaction(stxns).do();
        this.status = AtomicTransactionComposerStatus.SUBMITTED;
        return this.txIDs;
    }
    /**
     * Simulates the transaction group in the network.
     *
     * The composer will try to sign any transactions in the group, then simulate
     * the results.
     * Simulating the group will not change the composer's status.
     *
     * @param client - An Algodv2 client
     * @param request - SimulateRequest with options in simulation.
     *   If provided, the request's transaction group will be overrwritten by the composer's group,
     *   only simulation related options will be used.
     *
     * @returns A promise that, upon success, resolves to an object containing an
     *   array of results containing one element for each method call transaction
     *   in this group (ABIResult[]) and the SimulateResponse object.
     */
    async simulate(client, request) {
        if (this.status > AtomicTransactionComposerStatus.SUBMITTED) {
            throw new Error('Simulated Transaction group has already been submitted to the network');
        }
        const stxns = await this.gatherSignatures();
        const txnObjects = stxns.map((stxn) => encoding.decodeMsgpack(stxn, SignedTransaction));
        const currentRequest = request == null ? new SimulateRequest({ txnGroups: [] }) : request;
        currentRequest.txnGroups = [
            new SimulateRequestTransactionGroup({
                txns: txnObjects,
            }),
        ];
        const simulateResponse = await client
            .simulateTransactions(currentRequest)
            .do();
        // Parse method response
        const methodResults = [];
        for (const [txnIndex, method] of this.methodCalls) {
            const txID = this.txIDs[txnIndex];
            const pendingInfo = simulateResponse.txnGroups[0].txnResults[txnIndex].txnResult;
            const methodResult = {
                txID,
                rawReturnValue: new Uint8Array(),
                method,
            };
            methodResults.push(AtomicTransactionComposer.parseMethodResponse(method, methodResult, pendingInfo));
        }
        return { methodResults, simulateResponse };
    }
    /**
     * Send the transaction group to the network and wait until it's committed to a block. An error
     * will be thrown if submission or execution fails.
     *
     * The composer's status must be SUBMITTED or lower before calling this method, since execution is
     * only allowed once. If submission is successful, this composer's status will update to SUBMITTED.
     * If the execution is also successful, this composer's status will update to COMMITTED.
     *
     * Note: a group can only be submitted again if it fails.
     *
     * @param client - An Algodv2 client
     * @param waitRounds - The maximum number of rounds to wait for transaction confirmation
     *
     * @returns A promise that, upon success, resolves to an object containing the confirmed round for
     *   this transaction, the txIDs of the submitted transactions, and an array of results containing
     *   one element for each method call transaction in this group.
     */
    async execute(client, waitRounds) {
        if (this.status === AtomicTransactionComposerStatus.COMMITTED) {
            throw new Error('Transaction group has already been executed successfully');
        }
        const txIDs = await this.submit(client);
        this.status = AtomicTransactionComposerStatus.SUBMITTED;
        const firstMethodCallIndex = this.transactions.findIndex((_, index) => this.methodCalls.has(index));
        const indexToWaitFor = firstMethodCallIndex === -1 ? 0 : firstMethodCallIndex;
        const confirmedTxnInfo = await waitForConfirmation(client, txIDs[indexToWaitFor], waitRounds);
        this.status = AtomicTransactionComposerStatus.COMMITTED;
        const confirmedRound = confirmedTxnInfo.confirmedRound;
        const methodResults = [];
        for (const [txnIndex, method] of this.methodCalls) {
            const txID = txIDs[txnIndex];
            let methodResult = {
                txID,
                rawReturnValue: new Uint8Array(),
                method,
            };
            try {
                const pendingInfo = txnIndex === firstMethodCallIndex
                    ? confirmedTxnInfo
                    : // eslint-disable-next-line no-await-in-loop
                        await client.pendingTransactionInformation(txID).do();
                methodResult = AtomicTransactionComposer.parseMethodResponse(method, methodResult, pendingInfo);
            }
            catch (err) {
                methodResult.decodeError = err;
            }
            methodResults.push(methodResult);
        }
        return {
            confirmedRound,
            txIDs,
            methodResults,
        };
    }
    /**
     * Parses a single ABI Method transaction log into a ABI result object.
     *
     * @param method
     * @param methodResult
     * @param pendingInfo
     * @returns An ABIResult object
     */
    static parseMethodResponse(method, methodResult, pendingInfo) {
        const returnedResult = methodResult;
        try {
            returnedResult.txInfo = pendingInfo;
            if (method.returns.type !== 'void') {
                const logs = pendingInfo.logs || [];
                if (logs.length === 0) {
                    throw new Error(`App call transaction did not log a return value ${stringifyJSON(pendingInfo)}`);
                }
                const lastLog = logs[logs.length - 1];
                if (lastLog.byteLength < 4 ||
                    !arrayEqual(lastLog.slice(0, 4), RETURN_PREFIX)) {
                    throw new Error(`App call transaction did not log a ABI return value ${stringifyJSON(pendingInfo)}`);
                }
                returnedResult.rawReturnValue = new Uint8Array(lastLog.slice(4));
                returnedResult.returnValue = method.returns.type.decode(methodResult.rawReturnValue);
            }
        }
        catch (err) {
            returnedResult.decodeError = err;
        }
        return returnedResult;
    }
}
/** The maximum size of an atomic transaction group. */
AtomicTransactionComposer.MAX_GROUP_SIZE = 16;
//# sourceMappingURL=composer.js.map