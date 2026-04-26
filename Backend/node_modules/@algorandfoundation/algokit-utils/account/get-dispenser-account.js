'use strict';

var types_accountManager = require('../types/account-manager.js');
var types_clientManager = require('../types/client-manager.js');

/**
 * @deprecated Use `algorand.account.dispenserFromEnvironment()` or `new AccountManager(clientManager).dispenserFromEnvironment()` instead
 *
 * Returns an account (with private key loaded) that can act as a dispenser
 *
 * If running on LocalNet then it will return the default dispenser account automatically,
 *  otherwise it will load the account mnemonic stored in process.env.DISPENSER_MNEMONIC
 *
 * @param algod An algod client
 * @param kmd A KMD client, if not specified then a default KMD client will be loaded from environment variables
 */
async function getDispenserAccount(algod, kmd) {
    return new types_accountManager.AccountManager(new types_clientManager.ClientManager({ algod, kmd })).dispenserFromEnvironment();
}

exports.getDispenserAccount = getDispenserAccount;
//# sourceMappingURL=get-dispenser-account.js.map
