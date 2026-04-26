import { Schema, } from '../encoding.js';
import { base64ToBytes, bytesToBase64 } from '../binarydata.js';
/* eslint-disable class-methods-use-this */
export class ByteArraySchema extends Schema {
    defaultValue() {
        return new Uint8Array();
    }
    isDefaultValue(data) {
        return data instanceof Uint8Array && data.byteLength === 0;
    }
    prepareMsgpack(data) {
        if (data instanceof Uint8Array) {
            return data;
        }
        throw new Error(`Invalid byte array: (${typeof data}) ${data}`);
    }
    fromPreparedMsgpack(encoded, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _rawStringProvider) {
        if (encoded instanceof Uint8Array) {
            return encoded;
        }
        throw new Error(`Invalid byte array: (${typeof encoded}) ${encoded}`);
    }
    prepareJSON(data, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options) {
        if (data instanceof Uint8Array) {
            return bytesToBase64(data);
        }
        throw new Error(`Invalid byte array: (${typeof data}) ${data}`);
    }
    fromPreparedJSON(encoded) {
        if (encoded === null || encoded === undefined) {
            return this.defaultValue();
        }
        if (typeof encoded === 'string') {
            return base64ToBytes(encoded);
        }
        throw new Error(`Invalid byte array: (${typeof encoded}) ${encoded}`);
    }
}
export class FixedLengthByteArraySchema extends Schema {
    constructor(length) {
        super();
        this.length = length;
    }
    defaultValue() {
        return new Uint8Array(this.length);
    }
    isDefaultValue(data) {
        return (data instanceof Uint8Array &&
            data.byteLength === this.length &&
            data.every((byte) => byte === 0));
    }
    prepareMsgpack(data) {
        if (data instanceof Uint8Array) {
            if (data.byteLength === this.length) {
                return data;
            }
            throw new Error(`Invalid byte array length: wanted ${this.length}, got ${data.byteLength}`);
        }
        throw new Error('Invalid byte array');
    }
    fromPreparedMsgpack(encoded, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _rawStringProvider) {
        if (encoded instanceof Uint8Array) {
            if (encoded.byteLength === this.length) {
                return encoded;
            }
            throw new Error(`Invalid byte array length: wanted ${this.length}, got ${encoded.byteLength}`);
        }
        throw new Error('Invalid byte array');
    }
    prepareJSON(data) {
        if (data instanceof Uint8Array) {
            if (data.byteLength === this.length) {
                return bytesToBase64(data);
            }
            throw new Error(`Invalid byte array length: wanted ${this.length}, got ${data.byteLength}`);
        }
        throw new Error('Invalid byte array');
    }
    fromPreparedJSON(encoded) {
        if (typeof encoded === 'string') {
            const bytes = base64ToBytes(encoded);
            if (bytes.byteLength === this.length) {
                return bytes;
            }
            throw new Error(`Invalid byte array length: wanted ${this.length}, got ${bytes.byteLength}`);
        }
        throw new Error('Invalid base64 byte array');
    }
}
//# sourceMappingURL=bytearray.js.map