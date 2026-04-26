export declare function ensureUint8Array(buffer: ArrayLike<number> | Uint8Array | ArrayBufferView | ArrayBuffer): Uint8Array;
export declare function createDataView(buffer: ArrayLike<number> | ArrayBufferView | ArrayBuffer): DataView;
export declare function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number;
/**
 * Represents a binary value that should be encoded as if it were a string.
 *
 * Effectively, this is a string that has already been UTF-8 encoded to a binary string. This is
 * useful if you need to encode a value as a string, but that value contains invalid UTF-8 sequences;
 * ideally this situation should be avoided and the value should be encoded as binary, not string,
 * but this may be necessary for compatibility with non-ideal systems.
 */
export declare class RawBinaryString {
    readonly rawBinaryValue: ArrayBufferView;
    /**
     * Create a new RawBinaryString from an ArrayBufferView.
     */
    constructor(rawBinaryValue: ArrayBufferView);
}
