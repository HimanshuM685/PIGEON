'use strict';

var util = require('../util.js');

/** Exposes an AlgoKit logger which captures log messages, while wrapping an original logger.
 * This is useful for automated testing.
 */
class TestLogger {
    /**
     * Create a new test logger that wraps the given logger if provided.
     * @param originalLogger The optional original logger to wrap.
     */
    constructor(originalLogger) {
        this.originalLogger = originalLogger;
        this.logs = [];
    }
    /** Returns all logs captured thus far. */
    get capturedLogs() {
        return this.logs;
    }
    /** Clears all logs captured so far. */
    clear() {
        this.logs = [];
    }
    /**
     * Returns a captured log snapshot.
     * This helps ensure that the provided configuration items won't appear
     *  with random values in the log snapshot, but rather will get substituted with predictable ids.
     *
     * https://jestjs.io/docs/snapshot-testing#2-tests-should-be-deterministic
     *
     * @example Jest Example
     * ```typescript
     * const logger = new TestLogger()
     * ...
     * expect(logger.getLogSnapshot()).toMatchSnapshot()
     * ```
     * @param config The snapshot configuration
     * @returns The snapshotted logs.
     */
    getLogSnapshot(config) {
        const { transactions: transactionIds, accounts, apps } = config ?? {};
        let snapshot = this.capturedLogs.filter(config?.filterPredicate ?? (() => true)).join('\n');
        transactionIds?.forEach((txn, id) => (snapshot = snapshot.replace(new RegExp(typeof txn === 'string' ? txn : txn.txID(), 'g'), `TXID_${id + 1}`)));
        accounts?.forEach((sender, id) => (snapshot = snapshot.replace(new RegExp(typeof sender === 'string'
            ? sender
            : 'addr' in sender
                ? sender.addr.toString()
                : 'address' in sender
                    ? sender.address().toString()
                    : sender.toString(), 'g'), `ACCOUNT_${id + 1}`)));
        apps?.forEach((app, id) => (snapshot = snapshot.replace(new RegExp(`\\b${app.toString()}\\b(?! bytes)`, 'g'), `APP_${id + 1}`)));
        return snapshot;
    }
    error(message, ...optionalParams) {
        this.originalLogger?.error(message, ...optionalParams);
        this.logs.push(`ERROR: ${message}${optionalParams.length ? ` | ${util.asJson(optionalParams)}` : ''}`);
    }
    warn(message, ...optionalParams) {
        this.originalLogger?.warn(message, ...optionalParams);
        this.logs.push(`WARN: ${message}${optionalParams.length ? ` | ${util.asJson(optionalParams)}` : ''}`);
    }
    info(message, ...optionalParams) {
        this.originalLogger?.info(message, ...optionalParams);
        this.logs.push(`INFO: ${message}${optionalParams.length ? ` | ${util.asJson(optionalParams)}` : ''}`);
    }
    verbose(message, ...optionalParams) {
        this.originalLogger?.verbose(message, ...optionalParams);
        this.logs.push(`VERBOSE: ${message}${optionalParams.length ? ` | ${util.asJson(optionalParams)}` : ''}`);
    }
    debug(message, ...optionalParams) {
        this.originalLogger?.debug(message, ...optionalParams);
        this.logs.push(`DEBUG: ${message}${optionalParams.length ? ` | ${util.asJson(optionalParams)}` : ''}`);
    }
}

exports.TestLogger = TestLogger;
//# sourceMappingURL=test-logger.js.map
