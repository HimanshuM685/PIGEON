'use strict';

var types_clientManager = require('../types/client-manager.js');

/** @deprecated Use `await algorand.client.isLocalNet()` or `await new ClientManager({ algod }).isLocalNet()` instead.
 *
 * Returns true if the algod client is pointing to a LocalNet Algorand network
 */
async function isLocalNet(algod) {
    return await new types_clientManager.ClientManager({ algod }).isLocalNet();
}

exports.isLocalNet = isLocalNet;
//# sourceMappingURL=is-localnet.js.map
