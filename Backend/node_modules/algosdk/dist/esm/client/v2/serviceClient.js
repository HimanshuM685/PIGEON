import { HTTPClient } from '../client.js';
/**
 * Convert a token string to a token header
 * @param token - The token string
 * @param headerIdentifier - An identifier for the token header
 */
function convertTokenStringToTokenHeader(headerIdentifier, token = '') {
    const tokenHeader = {};
    if (token === '') {
        return tokenHeader;
    }
    tokenHeader[headerIdentifier] = token;
    return tokenHeader;
}
function isBaseHTTPClient(tbc) {
    return typeof tbc.get === 'function';
}
/**
 * Abstract service client to encapsulate shared AlgodClient and IndexerClient logic
 */
export default class ServiceClient {
    constructor(tokenHeaderIdentifier, tokenHeaderOrStrOrBaseClient, baseServer, port, defaultHeaders = {}) {
        if (isBaseHTTPClient(tokenHeaderOrStrOrBaseClient)) {
            // we are using a base client
            this.c = new HTTPClient(tokenHeaderOrStrOrBaseClient);
        }
        else {
            // Accept token header as string or object
            // - workaround to allow backwards compatibility for multiple headers
            let tokenHeader;
            if (typeof tokenHeaderOrStrOrBaseClient === 'string') {
                tokenHeader = convertTokenStringToTokenHeader(tokenHeaderIdentifier, tokenHeaderOrStrOrBaseClient);
            }
            else {
                tokenHeader = tokenHeaderOrStrOrBaseClient;
            }
            this.c = new HTTPClient(tokenHeader, baseServer, port, defaultHeaders);
        }
    }
}
//# sourceMappingURL=serviceClient.js.map