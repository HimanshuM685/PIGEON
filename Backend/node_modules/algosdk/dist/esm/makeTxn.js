import { Transaction } from './transaction.js';
import { OnApplicationComplete, TransactionType, } from './types/transactions/base.js';
import { foreignArraysToResourceReferences } from './appAccess.js';
/**
 * Create a new payment transaction
 *
 * @param options - Payment transaction parameters
 */
export function makePaymentTxnWithSuggestedParamsFromObject({ sender, receiver, amount, closeRemainderTo, suggestedParams, note, lease, rekeyTo, }) {
    return new Transaction({
        type: TransactionType.pay,
        sender,
        note,
        lease,
        rekeyTo,
        suggestedParams,
        paymentParams: {
            receiver,
            amount,
            closeRemainderTo,
        },
    });
}
/**
 * Create a new key registration transaction
 *
 * @param options - Key registration transaction parameters
 */
export function makeKeyRegistrationTxnWithSuggestedParamsFromObject({ sender, voteKey, selectionKey, stateProofKey, voteFirst, voteLast, voteKeyDilution, nonParticipation, suggestedParams, note, lease, rekeyTo, }) {
    return new Transaction({
        type: TransactionType.keyreg,
        sender,
        note,
        lease,
        rekeyTo,
        suggestedParams,
        keyregParams: {
            voteKey,
            selectionKey,
            stateProofKey,
            voteFirst,
            voteLast,
            voteKeyDilution,
            nonParticipation,
        },
    });
}
/**
 * Base function for creating any type of asset config transaction.
 *
 * @param options - Asset config transaction parameters
 */
export function makeBaseAssetConfigTxn({ sender, assetIndex, total, decimals, defaultFrozen, manager, reserve, freeze, clawback, unitName, assetName, assetURL, assetMetadataHash, note, lease, rekeyTo, suggestedParams, }) {
    return new Transaction({
        type: TransactionType.acfg,
        sender,
        note,
        lease,
        rekeyTo,
        suggestedParams,
        assetConfigParams: {
            assetIndex,
            total,
            decimals,
            defaultFrozen,
            manager,
            reserve,
            freeze,
            clawback,
            unitName,
            assetName,
            assetURL,
            assetMetadataHash,
        },
    });
}
/**
 * Create a new asset creation transaction
 *
 * @param options - Asset creation transaction parameters
 */
export function makeAssetCreateTxnWithSuggestedParamsFromObject({ sender, total, decimals, defaultFrozen, manager, reserve, freeze, clawback, unitName, assetName, assetURL, assetMetadataHash, note, lease, rekeyTo, suggestedParams, }) {
    return makeBaseAssetConfigTxn({
        sender,
        total,
        decimals,
        defaultFrozen,
        manager,
        reserve,
        freeze,
        clawback,
        unitName,
        assetName,
        assetURL,
        assetMetadataHash,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Create a new asset config transaction. This transaction can be issued by the asset manager to
 * change the manager, reserve, freeze, or clawback address.
 *
 * You must respecify existing addresses to keep them the same; leaving a field blank is the same as
 * turning that feature off for this asset.
 *
 * @param options - Asset modification transaction parameters
 */
export function makeAssetConfigTxnWithSuggestedParamsFromObject({ sender, assetIndex, manager, reserve, freeze, clawback, strictEmptyAddressChecking, note, lease, rekeyTo, suggestedParams, }) {
    if (!assetIndex) {
        throw Error('assetIndex must be provided');
    }
    const strictChecking = strictEmptyAddressChecking ?? true;
    if (strictChecking &&
        (manager == null || reserve == null || freeze == null || clawback == null)) {
        throw Error('strictEmptyAddressChecking is enabled, but an address is empty. If this is intentional, set strictEmptyAddressChecking to false.');
    }
    return makeBaseAssetConfigTxn({
        sender,
        assetIndex,
        manager,
        reserve,
        freeze,
        clawback,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Create a new asset destroy transaction. This will allow the asset's manager to remove this asset
 * from the ledger, provided all outstanding assets are held by the creator.
 *
 * @param options - Asset destroy transaction parameters
 */
export function makeAssetDestroyTxnWithSuggestedParamsFromObject({ sender, assetIndex, note, lease, rekeyTo, suggestedParams, }) {
    if (!assetIndex) {
        throw Error('assetIndex must be provided');
    }
    return makeBaseAssetConfigTxn({
        sender,
        assetIndex,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Create a new asset freeze transaction. This transaction allows the asset's freeze manager to
 * freeze or un-freeze an account, blocking or allowing asset transfers to and from the targeted
 * account.
 *
 * @param options - Asset freeze transaction parameters
 */
export function makeAssetFreezeTxnWithSuggestedParamsFromObject({ sender, assetIndex, freezeTarget, frozen, suggestedParams, note, lease, rekeyTo, }) {
    return new Transaction({
        type: TransactionType.afrz,
        sender,
        note,
        lease,
        rekeyTo,
        suggestedParams,
        assetFreezeParams: {
            assetIndex,
            freezeTarget,
            frozen,
        },
    });
}
/**
 * Create a new asset transfer transaction.
 *
 * Special case: to opt into an assets, set amount=0 and sender=receiver.
 *
 * @param options - Asset transfer transaction parameters
 */
export function makeAssetTransferTxnWithSuggestedParamsFromObject({ sender, receiver, amount, closeRemainderTo, assetSender, note, assetIndex, suggestedParams, rekeyTo, lease, }) {
    if (!assetIndex) {
        throw Error('assetIndex must be provided');
    }
    return new Transaction({
        type: TransactionType.axfer,
        sender,
        note,
        lease,
        rekeyTo,
        suggestedParams,
        assetTransferParams: {
            assetIndex,
            receiver,
            amount,
            assetSender,
            closeRemainderTo,
        },
    });
}
/**
 * Base function for creating any application call transaction.
 *
 * @param options - Application call transaction parameters
 */
export function makeApplicationCallTxnFromObject({ sender, appIndex, onComplete, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, approvalProgram, clearProgram, numLocalInts, numLocalByteSlices, numGlobalInts, numGlobalByteSlices, extraPages, rejectVersion, note, lease, rekeyTo, suggestedParams, }) {
    if (onComplete == null) {
        throw Error('onComplete must be provided');
    }
    if (access &&
        (accounts || foreignApps || foreignAssets || boxes || holdings || locals)) {
        throw Error('cannot specify both access and other access fields');
    }
    let access2 = access;
    if (convertToAccess) {
        access2 = foreignArraysToResourceReferences({
            appIndex,
            accounts,
            foreignApps,
            foreignAssets,
            holdings,
            locals,
            boxes,
        });
    }
    return new Transaction({
        type: TransactionType.appl,
        sender,
        note,
        lease,
        rekeyTo,
        suggestedParams,
        appCallParams: {
            appIndex,
            onComplete,
            appArgs,
            // Only pass legacy foreign arrays if access is not provided
            accounts: access2 ? undefined : accounts,
            foreignAssets: access2 ? undefined : foreignAssets,
            foreignApps: access2 ? undefined : foreignApps,
            boxes: access2 ? undefined : boxes,
            access: access2,
            approvalProgram,
            clearProgram,
            numLocalInts,
            numLocalByteSlices,
            numGlobalInts,
            numGlobalByteSlices,
            extraPages,
            rejectVersion,
        },
    });
}
/**
 * Make a transaction that will create an application.
 *
 * @param options - Application creation transaction parameters
 */
export function makeApplicationCreateTxnFromObject({ sender, onComplete, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, approvalProgram, clearProgram, numLocalInts, numLocalByteSlices, numGlobalInts, numGlobalByteSlices, extraPages, note, lease, rekeyTo, suggestedParams, }) {
    if (!approvalProgram || !clearProgram) {
        throw Error('approvalProgram and clearProgram must be provided');
    }
    if (onComplete == null) {
        throw Error('onComplete must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex: 0,
        onComplete,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        convertToAccess,
        holdings,
        locals,
        access,
        approvalProgram,
        clearProgram,
        numLocalInts,
        numLocalByteSlices,
        numGlobalInts,
        numGlobalByteSlices,
        extraPages,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Make a transaction that changes an application's approval and clear programs
 *
 * @param options - Application update transaction parameters
 */
export function makeApplicationUpdateTxnFromObject({ sender, appIndex, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, approvalProgram, clearProgram, note, lease, rekeyTo, suggestedParams, }) {
    if (!appIndex) {
        throw Error('appIndex must be provided');
    }
    if (!approvalProgram || !clearProgram) {
        throw Error('approvalProgram and clearProgram must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex,
        onComplete: OnApplicationComplete.UpdateApplicationOC,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        convertToAccess,
        holdings,
        locals,
        access,
        approvalProgram,
        clearProgram,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Make a transaction that deletes an application
 *
 * @param options - Application deletion transaction parameters
 */
export function makeApplicationDeleteTxnFromObject({ sender, appIndex, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, note, lease, rekeyTo, suggestedParams, }) {
    if (!appIndex) {
        throw Error('appIndex must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex,
        onComplete: OnApplicationComplete.DeleteApplicationOC,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        convertToAccess,
        holdings,
        locals,
        access,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Make a transaction that opts in to use an application
 *
 * @param options - Application opt-in transaction parameters
 */
export function makeApplicationOptInTxnFromObject({ sender, appIndex, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, note, lease, rekeyTo, suggestedParams, }) {
    if (!appIndex) {
        throw Error('appIndex must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex,
        onComplete: OnApplicationComplete.OptInOC,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        note,
        convertToAccess,
        holdings,
        locals,
        access,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Make a transaction that closes out a user's state in an application
 *
 * @param options - Application close-out transaction parameters
 */
export function makeApplicationCloseOutTxnFromObject({ sender, appIndex, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, note, lease, rekeyTo, suggestedParams, }) {
    if (!appIndex) {
        throw Error('appIndex must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex,
        onComplete: OnApplicationComplete.CloseOutOC,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        convertToAccess,
        holdings,
        locals,
        access,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Make a transaction that clears a user's state in an application
 *
 * @param options - Application clear state transaction parameters
 */
export function makeApplicationClearStateTxnFromObject({ sender, appIndex, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, note, lease, rekeyTo, suggestedParams, }) {
    if (!appIndex) {
        throw Error('appIndex must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex,
        onComplete: OnApplicationComplete.ClearStateOC,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        convertToAccess,
        holdings,
        locals,
        access,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
/**
 * Make a transaction that just calls an application, doing nothing on completion
 *
 * @param options - Application no-op transaction parameters
 */
export function makeApplicationNoOpTxnFromObject({ sender, appIndex, appArgs, accounts, foreignApps, foreignAssets, boxes, convertToAccess, holdings, locals, access, note, lease, rekeyTo, suggestedParams, }) {
    if (!appIndex) {
        throw Error('appIndex must be provided');
    }
    return makeApplicationCallTxnFromObject({
        sender,
        appIndex,
        onComplete: OnApplicationComplete.NoOpOC,
        appArgs,
        accounts,
        foreignApps,
        foreignAssets,
        boxes,
        convertToAccess,
        holdings,
        locals,
        access,
        note,
        lease,
        rekeyTo,
        suggestedParams,
    });
}
//# sourceMappingURL=makeTxn.js.map