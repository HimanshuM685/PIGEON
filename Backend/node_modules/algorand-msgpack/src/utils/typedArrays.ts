export function ensureUint8Array(buffer: ArrayLike<number> | Uint8Array | ArrayBufferView | ArrayBuffer): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  } else if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer);
  } else {
    // ArrayLike<number>
    return Uint8Array.from(buffer);
  }
}

export function createDataView(buffer: ArrayLike<number> | ArrayBufferView | ArrayBuffer): DataView {
  if (buffer instanceof ArrayBuffer) {
    return new DataView(buffer);
  }

  const bufferView = ensureUint8Array(buffer);
  return new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
}

export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = a[i]! - b[i]!;
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
export class RawBinaryString {
  /**
   * Create a new RawBinaryString from an ArrayBufferView.
   */
  public constructor(public readonly rawBinaryValue: ArrayBufferView) {
    if (!ArrayBuffer.isView(rawBinaryValue)) {
      throw new TypeError("RawBinaryString: rawBinaryValue must be an ArrayBufferView");
    }
  }
}
