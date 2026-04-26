import JSONRequest from '../jsonrequest.js';
/**
 * healthCheck returns an empty object iff the node is running
 */
export default class HealthCheck extends JSONRequest {
    // eslint-disable-next-line class-methods-use-this
    path() {
        return '/health';
    }
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    prepare(_response) { }
}
//# sourceMappingURL=healthCheck.js.map