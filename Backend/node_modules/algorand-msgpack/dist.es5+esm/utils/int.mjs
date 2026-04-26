// Integer Utility
/**
 * An enum of different options for decoding integers.
 */
export var IntMode;
(function (IntMode) {
    /**
     * Always returns the value as a number. Be aware that there will be a loss of precision if the
     * value is outside the range of Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER.
     */
    IntMode[IntMode["UNSAFE_NUMBER"] = 0] = "UNSAFE_NUMBER";
    /**
     * Always returns the value as a number, but throws an error if the value is outside of the range
     * of Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER.
     */
    IntMode[IntMode["SAFE_NUMBER"] = 1] = "SAFE_NUMBER";
    /**
     * Returns all values encoded as int64/uint64 as bigints and all other integers as numbers.
     */
    IntMode[IntMode["AS_ENCODED"] = 2] = "AS_ENCODED";
    /**
     * Returns all values inside the range of Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER as
     * numbers and all values outside that range as bigints.
     */
    IntMode[IntMode["MIXED"] = 3] = "MIXED";
    /**
     * Always returns the value as a bigint, even if it is small enough to safely fit in a number.
     */
    IntMode[IntMode["BIGINT"] = 4] = "BIGINT";
})(IntMode || (IntMode = {}));
export var UINT32_MAX = 4294967295;
// DataView extension to handle int64 / uint64,
// where the actual range is 53-bits integer (a.k.a. safe integer)
export function setUint64(view, offset, value) {
    var high = value / 4294967296;
    var low = value; // high bits are truncated by DataView
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
}
export function setInt64(view, offset, value) {
    var high = Math.floor(value / 4294967296);
    var low = value; // high bits are truncated by DataView
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
}
export function getInt64(view, offset, mode) {
    if (mode === IntMode.UNSAFE_NUMBER || mode === IntMode.SAFE_NUMBER) {
        // for compatibility, don't use view.getBigInt64 if the user hasn't told us to use BigInts
        var high = view.getInt32(offset);
        var low = view.getUint32(offset + 4);
        if (mode === IntMode.SAFE_NUMBER &&
            (high < Math.floor(Number.MIN_SAFE_INTEGER / 4294967296) ||
                (high === Math.floor(Number.MIN_SAFE_INTEGER / 4294967296) && low === 0) ||
                high > (Number.MAX_SAFE_INTEGER - low) / 4294967296)) {
            var hexValue = "".concat(high < 0 ? "-" : "", "0x").concat(Math.abs(high).toString(16)).concat(low.toString(16).padStart(8, "0"));
            throw new Error("Mode is IntMode.SAFE_NUMBER and value is not a safe integer: ".concat(hexValue));
        }
        return high * 4294967296 + low;
    }
    var value = view.getBigInt64(offset);
    if (mode === IntMode.MIXED && value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
        return Number(value);
    }
    return value;
}
export function getUint64(view, offset, mode) {
    if (mode === IntMode.UNSAFE_NUMBER || mode === IntMode.SAFE_NUMBER) {
        // for compatibility, don't use view.getBigUint64 if the user hasn't told us to use BigInts
        var high = view.getUint32(offset);
        var low = view.getUint32(offset + 4);
        if (mode === IntMode.SAFE_NUMBER && high > (Number.MAX_SAFE_INTEGER - low) / 4294967296) {
            var hexValue = "0x".concat(high.toString(16)).concat(low.toString(16).padStart(8, "0"));
            throw new Error("Mode is IntMode.SAFE_NUMBER and value is not a safe integer: ".concat(hexValue));
        }
        return high * 4294967296 + low;
    }
    var value = view.getBigUint64(offset);
    if (mode === IntMode.MIXED && value <= Number.MAX_SAFE_INTEGER) {
        return Number(value);
    }
    return value;
}
/**
 * Convert a safe integer Number (i.e. in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER)
 * with respect to the given IntMode. For all modes except IntMode.BIGINT, this returns the original
 * Number unmodified.
 */
export function convertSafeIntegerToMode(value, mode) {
    if (mode === IntMode.BIGINT) {
        return BigInt(value);
    }
    return Number(value);
}
//# sourceMappingURL=int.mjs.map