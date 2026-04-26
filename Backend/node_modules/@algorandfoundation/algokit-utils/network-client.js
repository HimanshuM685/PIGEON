'use strict';

var types_clientManager = require('./types/client-manager.js');

/**
 * @deprecated Use `ClientManager.getConfigFromEnvironmentOrLocalNet()` instead.
 *
 * Retrieve configurations from environment variables when defined or get defaults (expects to be called from a Node.js environment not algod-side)
 */
function getConfigFromEnvOrDefaults() {
    return types_clientManager.ClientManager.getConfigFromEnvironmentOrLocalNet();
}
/**
 * @deprecated Use `ClientManager.getAlgodConfigFromEnvironment()` instead.
 *
 * Retrieve the algod configuration from environment variables (expects to be called from a Node.js environment not algod-side)
 */
function getAlgodConfigFromEnvironment() {
    return types_clientManager.ClientManager.getAlgodConfigFromEnvironment();
}
/**
 * @deprecated Use `ClientManager.getIndexerConfigFromEnvironment()` instead.
 *
 * Retrieve the indexer configuration from environment variables (expects to be called from a Node.js environment not algod-side)
 */
function getIndexerConfigFromEnvironment() {
    return types_clientManager.ClientManager.getIndexerConfigFromEnvironment();
}
/**
 * @deprecated Use `ClientManager.getAlgoNodeConfig(network, config)` instead.
 *
 * Returns the Algorand configuration to point to the AlgoNode service
 *
 * @param network Which network to connect to - TestNet or MainNet
 * @param config Which algod config to return - Algod or Indexer
 */
function getAlgoNodeConfig(network, config) {
    return types_clientManager.ClientManager.getAlgoNodeConfig(network, config);
}
/**
 * @deprecated Use `ClientManager.getDefaultLocalNetConfig(configOrPort)` instead.
 *
 * Returns the Algorand configuration to point to the default LocalNet
 *
 * @param configOrPort Which algod config to return - algod, kmd, or indexer OR a port number
 */
function getDefaultLocalNetConfig(configOrPort) {
    return types_clientManager.ClientManager.getDefaultLocalNetConfig(configOrPort);
}
/**
 * @deprecated Use `ClientManager.getAlgodClient(config)` or `ClientManager.getAlgodClientFromEnvironment()` instead.
 *
 * Returns an algod SDK client that automatically retries transient failures on idempotent calls
 *
 * @param config The config if you want to override the default (getting config from process.env)
 * @example Default (load from environment variables)
 *
 *  ```typescript
 *  // Uses process.env.ALGOD_SERVER, process.env.ALGOD_PORT and process.env.ALGOD_TOKEN
 *  // Automatically detects if you are using PureStake to switch in the right header name for ALGOD_TOKEN
 *  const algod = getAlgoClient()
 *  await algod.healthCheck().do()
 *  ```
 * @example AlgoNode (testnet)
 * ```typescript
 *  const algod = getAlgoClient(getAlgoNodeConfig('testnet', 'algod'))
 *  await algod.healthCheck().do()
 * ```
 * @example AlgoNode (mainnet)
 * ```typescript
 *  const algod = getAlgoClient(getAlgoNodeConfig('mainnet', 'algod'))
 *  await algod.healthCheck().do()
 * ```
 * @example Custom (e.g. default LocalNet, although we recommend loading this into a .env and using the Default option instead)
 * ```typescript
 *  const algod = getAlgoClient({server: 'http://localhost', port: '4001', token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'})
 *  await algod.healthCheck().do()
 * ```
 */
function getAlgoClient(config) {
    return config ? types_clientManager.ClientManager.getAlgodClient(config) : types_clientManager.ClientManager.getAlgodClientFromEnvironment();
}
/**
 * @deprecated Use `ClientManager.getIndexerClient(config, overrideIntDecoding)` or `ClientManager.getIndexerClientFromEnvironment(overrideIntDecoding)` instead.
 *
 * Returns an indexer SDK client that automatically retries transient failures on idempotent calls
 *
 * @param config The config if you want to override the default (getting config from process.env)
 * @example Default (load from environment variables)
 *
 *  ```typescript
 *  // Uses process.env.INDEXER_SERVER, process.env.INDEXER_PORT and process.env.INDEXER_TOKEN
 *  const indexer = getAlgoIndexerClient()
 *  await indexer.makeHealthCheck().do()
 *  ```
 * @example AlgoNode (testnet)
 * ```typescript
 *  const indexer = getAlgoIndexerClient(getAlgoNodeConfig('testnet', 'indexer'))
 *  await indexer.makeHealthCheck().do()
 * ```
 * @example AlgoNode (mainnet)
 * ```typescript
 *  const indexer = getAlgoIndexerClient(getAlgoNodeConfig('mainnet', 'indexer'))
 *  await indexer.makeHealthCheck().do()
 * ```
 * @example Custom (e.g. default LocalNet, although we recommend loading this into a .env and using the Default option instead)
 * ```typescript
 *  const indexer = getAlgoIndexerClient({server: 'http://localhost', port: '8980', token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'})
 *  await indexer.makeHealthCheck().do()
 * ```
 */
function getAlgoIndexerClient(config) {
    return config ? types_clientManager.ClientManager.getIndexerClient(config) : types_clientManager.ClientManager.getIndexerClientFromEnvironment();
}
/**
 * @deprecated Use `ClientManager.getKmdClient(config)` or `ClientManager.getKmdClientFromEnvironment()` instead.
 *
 * Returns a KMD SDK client that automatically retries transient failures on idempotent calls.
 *
 * KMD client allows you to export private keys, which is useful to get the default account in a LocalNet network.
 *
 * @param config The config if you want to override the default (getting config from process.env)
 * @example Default (load from environment variables)
 *
 *  ```typescript
 *  // Uses process.env.ALGOD_SERVER, process.env.KMD_PORT (or if not specified: port 4002) and process.env.ALGOD_TOKEN
 *  const kmd = getAlgoKmdClient()
 *  ```
 * @example Custom (e.g. default LocalNet, although we recommend loading this into a .env and using the Default option instead)
 * ```typescript
 *  const kmd = getAlgoKmdClient({server: 'http://localhost', port: '4002', token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'})
 * ```
 */
function getAlgoKmdClient(config) {
    return config ? types_clientManager.ClientManager.getKmdClient(config) : types_clientManager.ClientManager.getKmdClientFromEnvironment();
}
/** @deprecated Use `await algorand.client.isTestNet()` or `await new ClientManager({ algod }).isTestNet()` instead. */
async function isTestNet(algod) {
    return await new types_clientManager.ClientManager({ algod }).isTestNet();
}
/** @deprecated Use `await algorand.client.isMainNet()` or `await new ClientManager({ algod }).isMainNet()` instead. */
async function isMainNet(algod) {
    return await new types_clientManager.ClientManager({ algod }).isMainNet();
}

exports.getAlgoClient = getAlgoClient;
exports.getAlgoIndexerClient = getAlgoIndexerClient;
exports.getAlgoKmdClient = getAlgoKmdClient;
exports.getAlgoNodeConfig = getAlgoNodeConfig;
exports.getAlgodConfigFromEnvironment = getAlgodConfigFromEnvironment;
exports.getConfigFromEnvOrDefaults = getConfigFromEnvOrDefaults;
exports.getDefaultLocalNetConfig = getDefaultLocalNetConfig;
exports.getIndexerConfigFromEnvironment = getIndexerConfigFromEnvironment;
exports.isMainNet = isMainNet;
exports.isTestNet = isTestNet;
//# sourceMappingURL=network-client.js.map
