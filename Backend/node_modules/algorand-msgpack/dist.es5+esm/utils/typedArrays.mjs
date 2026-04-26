export function ensureUint8Array(buffer) {
    if (buffer instanceof Uint8Array) {
        return buffer;
    }
    else if (ArrayBuffer.isView(buffer)) {
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    else if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
    }
    else {
        // ArrayLike<number>
        return Uint8Array.from(buffer);
    }
}
export function createDataView(buffer) {
    if (buffer instanceof ArrayBuffer) {
        return new DataView(buffer);
    }
    var bufferView = ensureUint8Array(buffer);
    return new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
}
export function compareUint8Arrays(a, b) {
    var length = Math.min(a.length, b.length);
    for (var i = 0; i < length; i++) {
        var diff = a[i] - b[i];
        if (diff !== 0) {
            return diff;
        }
    }
    return a.length - b.length;
}
/**
 * Represents a binary value that should be encoded as if it were a string.
 *
 * Effectively, this is a string that has already been UTF-8 encoded to a binary string. This is
 * useful if you need to encode a value as a string, but that value contains invalid UTF-8 sequences;
 * ideally this situation should be avoided and the value should be encoded as binary, not string,
 * but this may be necessary for compatibility with non-ideal systems.
 */
var RawBinaryString = /** @class */ (function () {
    /**
     * Create a new RawBinaryString from an ArrayBufferView.
     */
    function RawBinaryString(rawBinaryValue) {
        this.rawBinaryValue = rawBinaryValue;
        if (!ArrayBuffer.isView(rawBinaryValue)) {
            throw new TypeError("RawBinaryString: rawBinaryValue must be an ArrayBufferView");
        }
    }
    return RawBinaryString;
}());
export { RawBinaryString };
//# sourceMappingURL=typedArrays.mjs.map