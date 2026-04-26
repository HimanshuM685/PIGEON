'use strict';

var algosdk = require('algosdk');

const DEFAULT_INDEXER_MAX_API_RESOURCES_PER_ACCOUNT = 1000; //MaxAPIResourcesPerAccount: This is the default maximum, though may be provider specific
/**
 * @deprecated Use `indexer.lookupTransactionByID(transactionId).do()`.
 * Looks up a transaction by ID using Indexer.
 * @param transactionId The ID of the transaction to look up
 * @param indexer An indexer client
 * @returns The result of the look-up
 */
async function lookupTransactionById(transactionId, indexer) {
    return await indexer.lookupTransactionByID(transactionId).do();
}
/**
 * @deprecated Use `indexer.lookupAccountByID(accountAddress).do()`.
 * Looks up an account by address using Indexer.
 * @param accountAddress The address of the account to look up
 * @param indexer An indexer client
 * @returns The result of the look-up
 */
async function lookupAccountByAddress(accountAddress, indexer) {
    return await indexer.lookupAccountByID(accountAddress).do();
}
/**
 * Looks up applications that were created by the given address; will automatically paginate through all data.
 * @param indexer An indexer instance
 * @param address The address of the creator to look up
 * @param getAll Whether or not to include deleted applications
 * @param paginationLimit The number of records to return per paginated request, default 1000
 * @returns The list of application results
 */
async function lookupAccountCreatedApplicationByAddress(indexer, address, getAll = undefined, paginationLimit) {
    return await executePaginatedRequest((response) => {
        if ('message' in response) {
            throw { status: 404, ...response };
        }
        return response.applications;
    }, (nextToken) => {
        let s = indexer
            .lookupAccountCreatedApplications(address)
            .includeAll(getAll)
            .limit(paginationLimit ?? DEFAULT_INDEXER_MAX_API_RESOURCES_PER_ACCOUNT);
        if (nextToken) {
            s = s.nextToken(nextToken);
        }
        return s;
    });
}
/**
 * Looks up asset holdings for the given asset; will automatically paginate through all data.
 * @param indexer An indexer instance
 * @param assetId The ID of the asset to look up holdings for
 * @param options Optional options to control the lookup
 * @param paginationLimit The number of records to return per paginated request, default 1000
 * @returns The list of application results
 */
async function lookupAssetHoldings(indexer, assetId, options, paginationLimit) {
    return await executePaginatedRequest((response) => {
        if ('message' in response) {
            throw { status: 404, ...response };
        }
        return response.balances;
    }, (nextToken) => {
        let s = indexer.lookupAssetBalances(Number(assetId)).limit(paginationLimit ?? DEFAULT_INDEXER_MAX_API_RESOURCES_PER_ACCOUNT);
        if (options?.currencyGreaterThan !== undefined) {
            s = s.currencyGreaterThan(options.currencyGreaterThan);
        }
        if (options?.currencyLessThan !== undefined) {
            s = s.currencyLessThan(options.currencyLessThan);
        }
        if (options?.includeAll !== undefined) {
            s = s.includeAll(options.includeAll);
        }
        if (nextToken) {
            s = s.nextToken(nextToken);
        }
        return s;
    });
}
/**
 * Allows transactions to be searched for the given criteria.
 * @param indexer An indexer client
 * @param searchCriteria The criteria to search for
 * @param paginationLimit The number of records to return per paginated request, default 1000
 * @returns The search results
 */
async function searchTransactions(indexer, searchCriteria, paginationLimit) {
    let currentRound = 0n;
    const transactions = await executePaginatedRequest((response) => {
        if ('message' in response) {
            throw { status: 404, ...response };
        }
        if (response.currentRound > currentRound) {
            currentRound = response.currentRound;
        }
        return response.transactions;
    }, (nextToken) => {
        let s = searchCriteria(indexer.searchForTransactions()).limit(paginationLimit ?? DEFAULT_INDEXER_MAX_API_RESOURCES_PER_ACCOUNT);
        if (nextToken) {
            s = s.nextToken(nextToken);
        }
        return s;
    });
    return new algosdk.indexerModels.TransactionsResponse({
        currentRound,
        nextToken: undefined,
        transactions: transactions,
    });
}
// https://dev.algorand.co/reference/rest-apis/indexer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executePaginatedRequest(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extractItems, buildRequest) {
    const results = [];
    let nextToken = undefined;
    while (true) {
        const request = buildRequest(nextToken);
        const response = await request.do();
        const items = extractItems(response);
        if (items == null || items.length === 0) {
            break;
        }
        results.push(...items);
        nextToken = response['nextToken'];
        if (!nextToken) {
            break;
        }
    }
    return results;
}

exports.executePaginatedRequest = executePaginatedRequest;
exports.lookupAccountByAddress = lookupAccountByAddress;
exports.lookupAccountCreatedApplicationByAddress = lookupAccountCreatedApplicationByAddress;
exports.lookupAssetHoldings = lookupAssetHoldings;
exports.lookupTransactionById = lookupTransactionById;
exports.searchTransactions = searchTransactions;
//# sourceMappingURL=indexer-lookup.js.map
