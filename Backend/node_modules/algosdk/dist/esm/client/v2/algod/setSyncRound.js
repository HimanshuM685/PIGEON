import JSONRequest from '../jsonrequest.js';
export default class SetSyncRound extends JSONRequest {
    constructor(c, round) {
        super(c);
        this.round = BigInt(round);
    }
    path() {
        return `/v2/ledger/sync/${this.round}`;
    }
    executeRequest(headers, customOptions) {
        return this.c.post({
            relativePath: this.path(),
            data: null,
            requestHeaders: headers,
            customOptions,
        });
    }
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    prepare(_response) { }
}
//# sourceMappingURL=setSyncRound.js.map