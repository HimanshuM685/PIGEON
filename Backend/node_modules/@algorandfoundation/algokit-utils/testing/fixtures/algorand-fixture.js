'use strict';

var types_algorandClient = require('../../types/algorand-client.js');
var types_clientManager = require('../../types/client-manager.js');
var account = require('../account.js');
var indexer = require('../indexer.js');
var transactionLogger = require('../transaction-logger.js');
var amount = require('../../amount.js');
var config = require('../../config.js');

function algorandFixture(fixtureConfig, config$1) {
    fixtureConfig = { ...fixtureConfig, ...config$1 };
    if (!fixtureConfig.algod || !fixtureConfig.indexer || !fixtureConfig.kmd) {
        fixtureConfig = { ...types_clientManager.ClientManager.getConfigFromEnvironmentOrLocalNet(), ...fixtureConfig };
    }
    const algod = fixtureConfig.algod ?? types_clientManager.ClientManager.getAlgodClient(fixtureConfig.algodConfig);
    const indexer$1 = fixtureConfig.indexer ?? types_clientManager.ClientManager.getIndexerClient(fixtureConfig.indexerConfig);
    const kmd = fixtureConfig.kmd ?? types_clientManager.ClientManager.getKmdClient(fixtureConfig.kmdConfig);
    let context;
    let algorand;
    const newScope = async () => {
        config.Config.configure({ debug: true });
        const transactionLogger$1 = new transactionLogger.TransactionLogger();
        const transactionLoggerAlgod = transactionLogger$1.capture(algod);
        algorand = types_algorandClient.AlgorandClient.fromClients({ algod: transactionLoggerAlgod, indexer: indexer$1, kmd }).setSuggestedParamsCacheTimeout(0);
        const testAccount = await account.getTestAccount({ initialFunds: fixtureConfig?.testAccountFunding ?? amount.algos(10), suppressLog: true }, algorand);
        algorand.setSignerFromAccount(testAccount);
        // If running against LocalNet we are likely in dev mode and we need to set a much higher validity window
        //  otherwise we are more likely to get invalid transactions.
        if (await algorand.client.isLocalNet()) {
            algorand.setDefaultValidityWindow(1000);
        }
        context = {
            algorand,
            algod: transactionLoggerAlgod,
            indexer: indexer$1,
            kmd: kmd,
            testAccount,
            generateAccount: async (params) => {
                const account$1 = await account.getTestAccount(params, algorand);
                algorand.setSignerFromAccount(account$1);
                return account$1;
            },
            transactionLogger: transactionLogger$1,
            waitForIndexer: () => transactionLogger$1.waitForIndexer(indexer$1),
            waitForIndexerTransaction: (transactionId) => indexer.runWhenIndexerCaughtUp(() => indexer$1.lookupTransactionByID(transactionId).do()),
        };
    };
    return {
        get context() {
            if (!context)
                throw new Error('Context not initialised; make sure to call fixture.newScope() before accessing context.');
            return context;
        },
        get algorand() {
            return algorand;
        },
        beforeEach: newScope,
        newScope,
    };
}

exports.algorandFixture = algorandFixture;
//# sourceMappingURL=algorand-fixture.js.map
