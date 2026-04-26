'use strict';

var types_accountManager = require('../types/account-manager.js');
var types_clientManager = require('../types/client-manager.js');

/**
 * @deprecated Use `algorand.account.kmd.getLocalNetDispenserAccount()` instead.
 *
 * Returns an Algorand account with private key loaded for the default LocalNet dispenser account (that can be used to fund other accounts)
 *
 * @param algod An algod client
 * @param kmd A KMD client, if not specified then a default KMD client will be loaded from environment variables
 */
async function getLocalNetDispenserAccount(algod, kmd) {
    return (await new types_accountManager.AccountManager(new types_clientManager.ClientManager({ algod, kmd })).kmd.getLocalNetDispenserAccount()).account;
}

exports.getLocalNetDispenserAccount = getLocalNetDispenserAccount;
//# sourceMappingURL=get-localnet-dispenser-account.js.map
