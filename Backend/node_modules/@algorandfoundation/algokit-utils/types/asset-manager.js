'use strict';

var config = require('../config.js');
var util = require('../util.js');
var types_composer = require('./composer.js');

/** Allows management of asset information. */
class AssetManager {
    /**
     * Create a new asset manager.
     * @param algod An algod client
     * @param newGroup A function that creates a new `TransactionComposer` transaction group
     * @example Create a new asset manager
     * ```typescript
     * const assetManager = new AssetManager(algod, () => new TransactionComposer({algod, () => signer, () => suggestedParams}))
     * ```
     */
    constructor(algod, newGroup) {
        this._algod = algod;
        this._newGroup = newGroup;
    }
    /**
     * Returns the current asset information for the asset with the given ID.
     *
     * @example
     * ```typescript
     * const assetInfo = await assetManager.getById(12353n);
     * ```
     *
     * @param assetId The ID of the asset
     * @returns The asset information
     */
    async getById(assetId) {
        const asset = await this._algod.getAssetByID(Number(assetId)).do();
        return {
            assetId: BigInt(asset.index),
            total: BigInt(asset.params.total),
            decimals: Number(asset.params.decimals),
            assetName: asset.params.name,
            assetNameAsBytes: asset.params.nameB64,
            unitName: asset.params.unitName,
            unitNameAsBytes: asset.params.unitNameB64,
            url: asset.params.url,
            urlAsBytes: asset.params.urlB64,
            creator: asset.params.creator,
            manager: asset.params.manager,
            clawback: asset.params.clawback,
            freeze: asset.params.freeze,
            reserve: asset.params.reserve,
            defaultFrozen: asset.params.defaultFrozen,
            metadataHash: asset.params.metadataHash,
        };
    }
    /**
     * Returns the given sender account's asset holding for a given asset.
     *
     * @example
     * ```typescript
     * const address = "XBYLS2E6YI6XXL5BWCAMOA4GTWHXWENZMX5UHXMRNWWUQ7BXCY5WC5TEPA";
     * const assetId = 123345n;
     * const accountInfo = await assetManager.getAccountInformation(address, assetId);
     * ```
     *
     * [Response data schema details](https://dev.algorand.co/reference/rest-apis/algod/#accountassetinformation)
     * @param sender The address of the sender/account to look up
     * @param assetId The ID of the asset to return a holding for
     * @returns The account asset holding information
     */
    async getAccountInformation(sender, assetId) {
        const info = await this._algod.accountAssetInformation(sender, Number(assetId)).do();
        return {
            assetId: BigInt(assetId),
            balance: BigInt(info.assetHolding?.amount ?? 0),
            frozen: info.assetHolding?.isFrozen === true,
            round: BigInt(info['round']),
        };
    }
    /**
     * Opt an account in to a list of Algorand Standard Assets.
     *
     * Transactions will be sent in batches of 16 as transaction groups.
     *
     * @param account The account to opt-in
     * @param assetIds The list of asset IDs to opt-in to
     * @param options Any parameters to control the transaction or execution of the transaction
     * @example Example using AlgorandClient
     * ```typescript
     * // Basic example
     * assetManager.bulkOptIn("ACCOUNTADDRESS", [12345n, 67890n])
     * // With configuration
     * assetManager.bulkOptIn("ACCOUNTADDRESS", [12345n, 67890n], { maxFee: (1000).microAlgo(), suppressLog: true })
     * ```
     * @returns An array of records matching asset ID to transaction ID of the opt in
     */
    async bulkOptIn(account, assetIds, options) {
        const results = [];
        for (const assetGroup of util.chunkArray(assetIds, types_composer.MAX_TRANSACTION_GROUP_SIZE)) {
            const composer = this._newGroup();
            for (const assetId of assetGroup) {
                composer.addAssetOptIn({
                    ...options,
                    sender: account,
                    assetId: BigInt(assetId),
                });
            }
            const result = await composer.send(options);
            config.Config.getLogger(options?.suppressLog).info(`Successfully opted in ${account} for assets ${assetGroup.join(', ')} with transaction IDs ${result.txIds.join(', ')}` +
                `\n  Grouped under ${result.groupId} in round ${result.confirmations?.[0]?.confirmedRound}.`);
            assetGroup.forEach((assetId, index) => {
                results.push({ assetId: BigInt(assetId), transactionId: result.txIds[index] });
            });
        }
        return results;
    }
    /**
     * Opt an account out of a list of Algorand Standard Assets.
     *
     * Transactions will be sent in batches of 16 as transaction groups.
     *
     * @param account The account to opt-in
     * @param assetIds The list of asset IDs to opt-out of
     * @param options Any parameters to control the transaction or execution of the transaction
     * @example Example using AlgorandClient
     * ```typescript
     * // Basic example
     * assetManager.bulkOptOut("ACCOUNTADDRESS", [12345n, 67890n])
     * // With configuration
     * assetManager.bulkOptOut("ACCOUNTADDRESS", [12345n, 67890n], { ensureZeroBalance: true, maxFee: (1000).microAlgo(), suppressLog: true })
     * ```
     * @returns An array of records matching asset ID to transaction ID of the opt in
     */
    async bulkOptOut(account, assetIds, options) {
        const results = [];
        for (const assetGroup of util.chunkArray(assetIds, types_composer.MAX_TRANSACTION_GROUP_SIZE)) {
            const composer = this._newGroup();
            const notOptedInAssetIds = [];
            const nonZeroBalanceAssetIds = [];
            for (const assetId of assetGroup) {
                if (options?.ensureZeroBalance !== false) {
                    try {
                        const accountAssetInfo = await this.getAccountInformation(account, assetId);
                        if (accountAssetInfo.balance !== 0n) {
                            nonZeroBalanceAssetIds.push(BigInt(assetId));
                        }
                    }
                    catch {
                        notOptedInAssetIds.push(BigInt(assetId));
                    }
                }
            }
            if (notOptedInAssetIds.length > 0 || nonZeroBalanceAssetIds.length > 0) {
                throw new Error(`Account ${account}${notOptedInAssetIds.length > 0 ? ` is not opted-in to Asset${notOptedInAssetIds.length > 1 ? 's' : ''} ${notOptedInAssetIds.join(', ')}` : ''}${nonZeroBalanceAssetIds.length > 0
                    ? ` has non-zero balance for Asset${nonZeroBalanceAssetIds.length > 1 ? 's' : ''} ${nonZeroBalanceAssetIds.join(', ')}`
                    : ''}; can't opt-out.`);
            }
            for (const assetId of assetGroup) {
                composer.addAssetOptOut({
                    ...options,
                    creator: (await this.getById(BigInt(assetId))).creator,
                    sender: account,
                    assetId: BigInt(assetId),
                });
            }
            const result = await composer.send(options);
            config.Config.getLogger(options?.suppressLog).info(`Successfully opted ${account} out of assets ${assetGroup.join(', ')} with transaction IDs ${result.txIds.join(', ')}` +
                `\n  Grouped under ${result.groupId} in round ${result.confirmations?.[0]?.confirmedRound}.`);
            assetGroup.forEach((assetId, index) => {
                results.push({ assetId: BigInt(assetId), transactionId: result.txIds[index] });
            });
        }
        return results;
    }
}

exports.AssetManager = AssetManager;
//# sourceMappingURL=asset-manager.js.map
