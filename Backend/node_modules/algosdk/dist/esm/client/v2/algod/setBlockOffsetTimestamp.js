import JSONRequest from '../jsonrequest.js';
export default class SetBlockOffsetTimestamp extends JSONRequest {
    constructor(c, offset) {
        super(c);
        this.offset = BigInt(offset);
    }
    path() {
        return `/v2/devmode/blocks/offset/${this.offset}`;
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
//# sourceMappingURL=setBlockOffsetTimestamp.js.map