import JSONRequest from '../jsonrequest.js';
export default class Ready extends JSONRequest {
    // eslint-disable-next-line class-methods-use-this
    path() {
        return `/ready`;
    }
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    prepare(_response) { }
}
//# sourceMappingURL=ready.js.map