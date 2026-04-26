import { ExtensionCodecType } from "./ExtensionCodec";
import { IntMode } from "./utils/int";
import { KeyDecoder } from "./CachedKeyDecoder";
import type { ContextOf } from "./context";
export type DecoderOptions<ContextType = undefined> = Readonly<Partial<{
    extensionCodec: ExtensionCodecType<ContextType>;
    /**
     * Decodes Int64 and Uint64 as bigint if it's set to true.
     * Depends on ES2020's {@link DataView#getBigInt64} and
     * {@link DataView#getBigUint64}.
     *
     * Defaults to false. If true, equivalent to intMode: IntMode.AS_ENCODED.
     */
    useBigInt64: boolean;
    /**
     * Allows for more fine-grained control of BigInt handling, overrides useBigInt64.
     *
     * Defaults to IntMode.AS_ENCODED if useBigInt64 is true or IntMode.UNSAFE_NUMBER otherwise.
     */
    intMode?: IntMode;
    /**
     * By default, string values will be decoded as UTF-8 strings. However, if this option is true,
     * string values will be returned as Uint8Arrays without additional decoding.
     *
     * This is useful if the strings may contain invalid UTF-8 sequences.
     *
     * When enabled, raw string length is limited by the maxBinLength option.
     *
     * Note that this option only applies to string values, not map keys. See `rawBinaryStringKeys`
     * for map keys.
     */
    rawBinaryStringValues: boolean;
    /**
     * By default, map keys will be decoded as UTF-8 strings. However, if this option is true, map
     * keys will be returned as Uint8Arrays without additional decoding.
     *
     * Requires `useMap` to be true, since plain objects do not support binary keys.
     *
     * When enabled, raw string length is limited by the maxBinLength option.
     *
     * Note that this option only applies to map keys, not string values. See `rawBinaryStringValues`
     * for string values.
     */
    rawBinaryStringKeys: boolean;
    /**
     * If true, the decoder will use the RawBinaryString class to store raw binary strings created
     * during decoding from the rawBinaryStringValues and rawBinaryStringKeys options. If false, it
     * will use Uint8Arrays.
     *
     * Defaults to false.
     *
     * Has no effect if rawBinaryStringValues and rawBinaryStringKeys are both false.
     */
    useRawBinaryStringClass: boolean;
    /**
     * If true, the decoder will use the Map object to store map values. If false, it will use plain
     * objects. Defaults to false.
     *
     * Besides the type of container, the main difference is that Map objects support a wider range
     * of key types. Plain objects only support string keys (though you can enable
     * `supportObjectNumberKeys` to coerce number keys to strings), while Map objects support
     * strings, numbers, bigints, and Uint8Arrays.
     */
    useMap: boolean;
    /**
     * If true, the decoder will support decoding numbers as map keys on plain objects. Defaults to
     * false.
     *
     * Note that any numbers used as object keys will be converted to strings, so there is a risk of
     * key collision as well as the inability to re-encode the object to the same representation.
     *
     * This option is ignored if `useMap` is true.
     *
     * This is useful for backwards compatibility before `useMap` was introduced. Consider instead
     * using `useMap` for new code.
     */
    supportObjectNumberKeys: boolean;
    /**
     * Maximum string length.
     *
     * Defaults to 4_294_967_295 (UINT32_MAX).
     */
    maxStrLength: number;
    /**
     * Maximum binary length.
     *
     * Defaults to 4_294_967_295 (UINT32_MAX).
     */
    maxBinLength: number;
    /**
     * Maximum array length.
     *
     * Defaults to 4_294_967_295 (UINT32_MAX).
     */
    maxArrayLength: number;
    /**
     * Maximum map length.
     *
     * Defaults to 4_294_967_295 (UINT32_MAX).
     */
    maxMapLength: number;
    /**
     * Maximum extension length.
     *
     * Defaults to 4_294_967_295 (UINT32_MAX).
     */
    maxExtLength: number;
    /**
     * An object key decoder. Defaults to the shared instance of {@link CachedKeyDecoder}.
     * `null` is a special value to disable the use of the key decoder at all.
     */
    keyDecoder: KeyDecoder | null;
}>> & ContextOf<ContextType>;
export declare const DataViewIndexOutOfBoundsError: RangeErrorConstructor;
export declare class Decoder<ContextType = undefined> {
    private readonly extensionCodec;
    private readonly context;
    private readonly intMode;
    private readonly rawBinaryStringValues;
    private readonly rawBinaryStringKeys;
    private readonly useRawBinaryStringClass;
    private readonly useMap;
    private readonly supportObjectNumberKeys;
    private readonly maxStrLength;
    private readonly maxBinLength;
    private readonly maxArrayLength;
    private readonly maxMapLength;
    private readonly maxExtLength;
    private readonly keyDecoder;
    private totalPos;
    private pos;
    private view;
    private bytes;
    private headByte;
    private readonly stack;
    constructor(options?: DecoderOptions<ContextType>);
    private reinitializeState;
    private setBuffer;
    private appendBuffer;
    private hasRemaining;
    private createExtraByteError;
    /**
     * @throws {@link DecodeError}
     * @throws {@link RangeError}
     */
    decode(buffer: ArrayLike<number> | BufferSource): unknown;
    decodeMulti(buffer: ArrayLike<number> | BufferSource): Generator<unknown, void, unknown>;
    decodeAsync(stream: AsyncIterable<ArrayLike<number> | BufferSource>): Promise<unknown>;
    decodeArrayStream(stream: AsyncIterable<ArrayLike<number> | BufferSource>): AsyncGenerator<unknown, void, unknown>;
    decodeStream(stream: AsyncIterable<ArrayLike<number> | BufferSource>): AsyncGenerator<unknown, void, unknown>;
    private decodeMultiAsync;
    private doDecodeSync;
    private readHeadByte;
    private complete;
    private readArraySize;
    private pushMapState;
    private pushArrayState;
    private decodeString;
    private decodeUtf8String;
    private stateIsMapKey;
    private decodeBinary;
    private decodeExtension;
    private convertNumber;
    private lookU8;
    private lookU16;
    private lookU32;
    private readU8;
    private readI8;
    private readU16;
    private readI16;
    private readU32;
    private readI32;
    private readU64;
    private readI64;
    private readF32;
    private readF64;
}
