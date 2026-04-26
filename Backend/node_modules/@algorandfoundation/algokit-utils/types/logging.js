'use strict';

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/** A logger implementation that writes to console */
const consoleLogger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: () => { },
    debug: console.debug,
};
const infoConsoleLogger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: () => { },
    debug: () => { },
};
const verboseConsoleLogger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.trace,
    debug: console.debug,
};
const warningConsoleLogger = {
    error: console.error,
    warn: console.warn,
    info: () => { },
    verbose: () => { },
    debug: () => { },
};
/** A logger implementation that does nothing */
const nullLogger = {
    error: function (message, ...optionalParams) { },
    warn: function (message, ...optionalParams) { },
    info: function (message, ...optionalParams) { },
    verbose: function (message, ...optionalParams) { },
    debug: function (message, ...optionalParams) { },
};

exports.consoleLogger = consoleLogger;
exports.infoConsoleLogger = infoConsoleLogger;
exports.nullLogger = nullLogger;
exports.verboseConsoleLogger = verboseConsoleLogger;
exports.warningConsoleLogger = warningConsoleLogger;
//# sourceMappingURL=logging.js.map
