import JSONRequest from '../jsonrequest.js';
export default class UnsetSyncRound extends JSONRequest {
    // eslint-disable-next-line class-methods-use-this
    path() {
        return `/v2/ledger/sync`;
    }
    executeRequest(headers, customOptions) {
        return this.c.delete({
            relativePath: this.path(),
            data: undefined,
            requestHeaders: headers,
            customOptions,
        });
    }
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    prepare(_response) { }
}
//# sourceMappingURL=unsetSyncRound.js.map