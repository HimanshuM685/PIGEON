/**
 * An enum of different options for decoding integers.
 */
export declare enum IntMode {
    /**
     * Always returns the value as a number. Be aware that there will be a loss of precision if the
     * value is outside the range of Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER.
     */
    UNSAFE_NUMBER = 0,
    /**
     * Always returns the value as a number, but throws an error if the value is outside of the range
     * of Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER.
     */
    SAFE_NUMBER = 1,
    /**
     * Returns all values encoded as int64/uint64 as bigints and all other integers as numbers.
     */
    AS_ENCODED = 2,
    /**
     * Returns all values inside the range of Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER as
     * numbers and all values outside that range as bigints.
     */
    MIXED = 3,
    /**
     * Always returns the value as a bigint, even if it is small enough to safely fit in a number.
     */
    BIGINT = 4
}
export declare const UINT32_MAX = 4294967295;
export declare function setUint64(view: DataView, offset: number, value: number): void;
export declare function setInt64(view: DataView, offset: number, value: number): void;
export declare function getInt64(view: DataView, offset: number, mode: IntMode.UNSAFE_NUMBER | IntMode.SAFE_NUMBER): number;
export declare function getInt64(view: DataView, offset: number, mode: IntMode.BIGINT): bigint;
export declare function getInt64(view: DataView, offset: number, mode: IntMode): number | bigint;
export declare function getUint64(view: DataView, offset: number, mode: IntMode.UNSAFE_NUMBER | IntMode.SAFE_NUMBER): number;
export declare function getUint64(view: DataView, offset: number, mode: IntMode.BIGINT): bigint;
export declare function getUint64(view: DataView, offset: number, mode: IntMode): number | bigint;
/**
 * Convert a safe integer Number (i.e. in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER)
 * with respect to the given IntMode. For all modes except IntMode.BIGINT, this returns the original
 * Number unmodified.
 */
export declare function convertSafeIntegerToMode(value: number, mode: IntMode): number | bigint;
