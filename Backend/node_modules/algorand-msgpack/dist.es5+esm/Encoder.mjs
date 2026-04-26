import { utf8Count, utf8Encode } from "./utils/utf8.mjs";
import { ExtensionCodec } from "./ExtensionCodec.mjs";
import { setInt64, setUint64 } from "./utils/int.mjs";
import { ensureUint8Array, compareUint8Arrays, RawBinaryString } from "./utils/typedArrays.mjs";
export var DEFAULT_MAX_DEPTH = 100;
export var DEFAULT_INITIAL_BUFFER_SIZE = 2048;
var Encoder = /** @class */ (function () {
    function Encoder(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.extensionCodec = (_a = options === null || options === void 0 ? void 0 : options.extensionCodec) !== null && _a !== void 0 ? _a : ExtensionCodec.defaultCodec;
        this.context = options === null || options === void 0 ? void 0 : options.context; // needs a type assertion because EncoderOptions has no context property when ContextType is undefined
        this.forceBigIntToInt64 = (_b = options === null || options === void 0 ? void 0 : options.forceBigIntToInt64) !== null && _b !== void 0 ? _b : false;
        this.maxDepth = (_c = options === null || options === void 0 ? void 0 : options.maxDepth) !== null && _c !== void 0 ? _c : DEFAULT_MAX_DEPTH;
        this.initialBufferSize = (_d = options === null || options === void 0 ? void 0 : options.initialBufferSize) !== null && _d !== void 0 ? _d : DEFAULT_INITIAL_BUFFER_SIZE;
        this.sortKeys = (_e = options === null || options === void 0 ? void 0 : options.sortKeys) !== null && _e !== void 0 ? _e : false;
        this.forceFloat32 = (_f = options === null || options === void 0 ? void 0 : options.forceFloat32) !== null && _f !== void 0 ? _f : false;
        this.ignoreUndefined = (_g = options === null || options === void 0 ? void 0 : options.ignoreUndefined) !== null && _g !== void 0 ? _g : false;
        this.forceIntegerToFloat = (_h = options === null || options === void 0 ? void 0 : options.forceIntegerToFloat) !== null && _h !== void 0 ? _h : false;
        this.pos = 0;
        this.view = new DataView(new ArrayBuffer(this.initialBufferSize));
        this.bytes = new Uint8Array(this.view.buffer);
    }
    Encoder.prototype.reinitializeState = function () {
        this.pos = 0;
    };
    /**
     * This is almost equivalent to {@link Encoder#encode}, but it returns an reference of the encoder's internal buffer and thus much faster than {@link Encoder#encode}.
     *
     * @returns Encodes the object and returns a shared reference the encoder's internal buffer.
     */
    Encoder.prototype.encodeSharedRef = function (object) {
        this.reinitializeState();
        this.doEncode(object, 1);
        return this.bytes.subarray(0, this.pos);
    };
    /**
     * @returns Encodes the object and returns a copy of the encoder's internal buffer.
     */
    Encoder.prototype.encode = function (object) {
        this.reinitializeState();
        this.doEncode(object, 1);
        return this.bytes.slice(0, this.pos);
    };
    Encoder.prototype.doEncode = function (object, depth) {
        if (depth > this.maxDepth) {
            throw new Error("Too deep objects in depth ".concat(depth));
        }
        if (object == null) {
            this.encodeNil();
        }
        else if (typeof object === "boolean") {
            this.encodeBoolean(object);
        }
        else if (typeof object === "number") {
            this.encodeNumber(object);
        }
        else if (typeof object === "string") {
            this.encodeString(object);
        }
        else {
            this.encodeObject(object, depth);
        }
    };
    Encoder.prototype.ensureBufferSizeToWrite = function (sizeToWrite) {
        var requiredSize = this.pos + sizeToWrite;
        if (this.view.byteLength < requiredSize) {
            this.resizeBuffer(requiredSize * 2);
        }
    };
    Encoder.prototype.resizeBuffer = function (newSize) {
        var newBuffer = new ArrayBuffer(newSize);
        var newBytes = new Uint8Array(newBuffer);
        var newView = new DataView(newBuffer);
        newBytes.set(this.bytes);
        this.view = newView;
        this.bytes = newBytes;
    };
    Encoder.prototype.encodeNil = function () {
        this.writeU8(0xc0);
    };
    Encoder.prototype.encodeBoolean = function (object) {
        if (object === false) {
            this.writeU8(0xc2);
        }
        else {
            this.writeU8(0xc3);
        }
    };
    Encoder.prototype.encodeNumber = function (object) {
        if (!this.forceIntegerToFloat && Number.isSafeInteger(object)) {
            if (object >= 0) {
                if (object < 0x80) {
                    // positive fixint
                    this.writeU8(object);
                }
                else if (object < 0x100) {
                    // uint 8
                    this.writeU8(0xcc);
                    this.writeU8(object);
                }
                else if (object < 0x10000) {
                    // uint 16
                    this.writeU8(0xcd);
                    this.writeU16(object);
                }
                else if (object < 0x100000000) {
                    // uint 32
                    this.writeU8(0xce);
                    this.writeU32(object);
                }
                else {
                    // uint 64
                    this.writeU8(0xcf);
                    this.writeU64(object);
                }
            }
            else {
                if (object >= -0x20) {
                    // negative fixint
                    this.writeU8(0xe0 | (object + 0x20));
                }
                else if (object >= -0x80) {
                    // int 8
                    this.writeU8(0xd0);
                    this.writeI8(object);
                }
                else if (object >= -0x8000) {
                    // int 16
                    this.writeU8(0xd1);
                    this.writeI16(object);
                }
                else if (object >= -0x80000000) {
                    // int 32
                    this.writeU8(0xd2);
                    this.writeI32(object);
                }
                else {
                    // int 64
                    this.writeU8(0xd3);
                    this.writeI64(object);
                }
            }
        }
        else {
            this.encodeNumberAsFloat(object);
        }
    };
    Encoder.prototype.encodeNumberAsFloat = function (object) {
        if (this.forceFloat32) {
            // float 32
            this.writeU8(0xca);
            this.writeF32(object);
        }
        else {
            // float 64
            this.writeU8(0xcb);
            this.writeF64(object);
        }
    };
    Encoder.prototype.encodeBigInt = function (object) {
        if (this.forceBigIntToInt64) {
            this.encodeBigIntAsInt64(object);
        }
        else if (object >= 0) {
            if (object < 0x100000000 || this.forceIntegerToFloat) {
                // uint 32 or lower, or force to float
                this.encodeNumber(Number(object));
            }
            else if (object < BigInt("0x10000000000000000")) {
                // uint 64
                this.encodeBigIntAsInt64(object);
            }
            else {
                throw new Error("Bigint is too large for uint64: ".concat(object));
            }
        }
        else {
            if (object >= -0x80000000 || this.forceIntegerToFloat) {
                // int 32 or lower, or force to float
                this.encodeNumber(Number(object));
            }
            else if (object >= BigInt(-1) * BigInt("0x8000000000000000")) {
                // int 64
                this.encodeBigIntAsInt64(object);
            }
            else {
                throw new Error("Bigint is too small for int64: ".concat(object));
            }
        }
    };
    Encoder.prototype.encodeBigIntAsInt64 = function (object) {
        if (object >= BigInt(0)) {
            // uint 64
            this.writeU8(0xcf);
            this.writeBigUint64(object);
        }
        else {
            // int 64
            this.writeU8(0xd3);
            this.writeBigInt64(object);
        }
    };
    Encoder.prototype.writeStringHeader = function (byteLength) {
        if (byteLength < 32) {
            // fixstr
            this.writeU8(0xa0 + byteLength);
        }
        else if (byteLength < 0x100) {
            // str 8
            this.writeU8(0xd9);
            this.writeU8(byteLength);
        }
        else if (byteLength < 0x10000) {
            // str 16
            this.writeU8(0xda);
            this.writeU16(byteLength);
        }
        else if (byteLength < 0x100000000) {
            // str 32
            this.writeU8(0xdb);
            this.writeU32(byteLength);
        }
        else {
            throw new Error("Too long string: ".concat(byteLength, " bytes in UTF-8"));
        }
    };
    Encoder.prototype.encodeString = function (object) {
        var maxHeaderSize = 1 + 4;
        var byteLength = utf8Count(object);
        this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
        this.writeStringHeader(byteLength);
        utf8Encode(object, this.bytes, this.pos);
        this.pos += byteLength;
    };
    Encoder.prototype.encodeObject = function (object, depth) {
        // try to encode objects with custom codec first of non-primitives
        var ext = this.extensionCodec.tryToEncode(object, this.context);
        if (ext != null) {
            this.encodeExtension(ext);
        }
        else if (Array.isArray(object)) {
            this.encodeArray(object, depth);
        }
        else if (ArrayBuffer.isView(object)) {
            this.encodeBinary(object);
        }
        else if (object instanceof RawBinaryString) {
            this.encodeBinaryAsString(object);
        }
        else if (typeof object === "bigint") {
            // this is here instead of in doEncode so that we can try encoding with an extension first,
            // otherwise we would break existing extensions for bigints
            this.encodeBigInt(object);
        }
        else if (object instanceof Map) {
            this.encodeMap(object, depth);
        }
        else if (typeof object === "object") {
            this.encodeMapObject(object, depth);
        }
        else {
            // symbol, function and other special object come here unless extensionCodec handles them.
            throw new Error("Unrecognized object: ".concat(Object.prototype.toString.apply(object)));
        }
    };
    Encoder.prototype.encodeBinary = function (object) {
        var size = object.byteLength;
        if (size < 0x100) {
            // bin 8
            this.writeU8(0xc4);
            this.writeU8(size);
        }
        else if (size < 0x10000) {
            // bin 16
            this.writeU8(0xc5);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // bin 32
            this.writeU8(0xc6);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large binary: ".concat(size));
        }
        var bytes = ensureUint8Array(object);
        this.writeU8a(bytes);
    };
    Encoder.prototype.encodeBinaryAsString = function (binaryString) {
        var object = binaryString.rawBinaryValue;
        this.writeStringHeader(object.byteLength);
        var bytes = ensureUint8Array(object);
        this.writeU8a(bytes);
    };
    Encoder.prototype.encodeArray = function (object, depth) {
        var size = object.length;
        if (size < 16) {
            // fixarray
            this.writeU8(0x90 + size);
        }
        else if (size < 0x10000) {
            // array 16
            this.writeU8(0xdc);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // array 32
            this.writeU8(0xdd);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large array: ".concat(size));
        }
        for (var _i = 0, object_1 = object; _i < object_1.length; _i++) {
            var item = object_1[_i];
            this.doEncode(item, depth + 1);
        }
    };
    Encoder.prototype.countWithoutUndefined = function (map, keys) {
        var count = 0;
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            if (map.get(key) !== undefined) {
                count++;
            }
        }
        return count;
    };
    Encoder.prototype.sortMapKeys = function (keys) {
        var numericKeys = [];
        var stringKeys = [];
        var rawStringKeys = [];
        var binaryKeys = [];
        for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
            var key = keys_2[_i];
            if (typeof key === "number") {
                if (isNaN(key)) {
                    throw new Error("Cannot sort map keys with NaN value");
                }
                numericKeys.push(key);
            }
            else if (typeof key === "bigint") {
                numericKeys.push(key);
            }
            else if (typeof key === "string") {
                stringKeys.push(key);
            }
            else if (ArrayBuffer.isView(key)) {
                binaryKeys.push(ensureUint8Array(key));
            }
            else if (key instanceof RawBinaryString) {
                rawStringKeys.push(key);
            }
            else {
                throw new Error("Unsupported map key type: ".concat(Object.prototype.toString.apply(key)));
            }
        }
        numericKeys.sort(function (a, b) { return (a < b ? -1 : a > b ? 1 : 0); }); // Avoid using === to compare numbers and bigints
        stringKeys.sort();
        rawStringKeys.sort(function (a, b) {
            return compareUint8Arrays(ensureUint8Array(a.rawBinaryValue), ensureUint8Array(b.rawBinaryValue));
        });
        binaryKeys.sort(compareUint8Arrays);
        // At the moment this arbitrarily orders the keys as numeric, string, raw string, binary
        return [].concat(numericKeys, stringKeys, rawStringKeys, binaryKeys);
    };
    Encoder.prototype.encodeMapObject = function (object, depth) {
        this.encodeMap(new Map(Object.entries(object)), depth);
    };
    Encoder.prototype.encodeMap = function (map, depth) {
        var keys = Array.from(map.keys());
        if (this.sortKeys) {
            keys = this.sortMapKeys(keys);
        }
        // Map keys may encode to the same underlying value. For example, the number 3 and the bigint 3.
        // This is also possible with ArrayBufferViews. We may want to introduce a new encoding option
        // which checks for duplicate keys in this sense and throws an error if they are found.
        var size = this.ignoreUndefined ? this.countWithoutUndefined(map, keys) : keys.length;
        if (size < 16) {
            // fixmap
            this.writeU8(0x80 + size);
        }
        else if (size < 0x10000) {
            // map 16
            this.writeU8(0xde);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // map 32
            this.writeU8(0xdf);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large map object: ".concat(size));
        }
        for (var _i = 0, keys_3 = keys; _i < keys_3.length; _i++) {
            var key = keys_3[_i];
            var value = map.get(key);
            if (!(this.ignoreUndefined && value === undefined)) {
                if (typeof key === "string") {
                    this.encodeString(key);
                }
                else if (typeof key === "number") {
                    this.encodeNumber(key);
                }
                else if (typeof key === "bigint") {
                    this.encodeBigInt(key);
                }
                else if (ArrayBuffer.isView(key)) {
                    this.encodeBinary(key);
                }
                else if (key instanceof RawBinaryString) {
                    this.encodeBinaryAsString(key);
                }
                else {
                    throw new Error("Unsupported map key type: ".concat(Object.prototype.toString.apply(key)));
                }
                this.doEncode(value, depth + 1);
            }
        }
    };
    Encoder.prototype.encodeExtension = function (ext) {
        var size = ext.data.length;
        if (size === 1) {
            // fixext 1
            this.writeU8(0xd4);
        }
        else if (size === 2) {
            // fixext 2
            this.writeU8(0xd5);
        }
        else if (size === 4) {
            // fixext 4
            this.writeU8(0xd6);
        }
        else if (size === 8) {
            // fixext 8
            this.writeU8(0xd7);
        }
        else if (size === 16) {
            // fixext 16
            this.writeU8(0xd8);
        }
        else if (size < 0x100) {
            // ext 8
            this.writeU8(0xc7);
            this.writeU8(size);
        }
        else if (size < 0x10000) {
            // ext 16
            this.writeU8(0xc8);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // ext 32
            this.writeU8(0xc9);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large extension object: ".concat(size));
        }
        this.writeI8(ext.type);
        this.writeU8a(ext.data);
    };
    Encoder.prototype.writeU8 = function (value) {
        this.ensureBufferSizeToWrite(1);
        this.view.setUint8(this.pos, value);
        this.pos++;
    };
    Encoder.prototype.writeU8a = function (values) {
        var size = values.length;
        this.ensureBufferSizeToWrite(size);
        this.bytes.set(values, this.pos);
        this.pos += size;
    };
    Encoder.prototype.writeI8 = function (value) {
        this.ensureBufferSizeToWrite(1);
        this.view.setInt8(this.pos, value);
        this.pos++;
    };
    Encoder.prototype.writeU16 = function (value) {
        this.ensureBufferSizeToWrite(2);
        this.view.setUint16(this.pos, value);
        this.pos += 2;
    };
    Encoder.prototype.writeI16 = function (value) {
        this.ensureBufferSizeToWrite(2);
        this.view.setInt16(this.pos, value);
        this.pos += 2;
    };
    Encoder.prototype.writeU32 = function (value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setUint32(this.pos, value);
        this.pos += 4;
    };
    Encoder.prototype.writeI32 = function (value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setInt32(this.pos, value);
        this.pos += 4;
    };
    Encoder.prototype.writeF32 = function (value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setFloat32(this.pos, value);
        this.pos += 4;
    };
    Encoder.prototype.writeF64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setFloat64(this.pos, value);
        this.pos += 8;
    };
    Encoder.prototype.writeU64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        setUint64(this.view, this.pos, value);
        this.pos += 8;
    };
    Encoder.prototype.writeI64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        setInt64(this.view, this.pos, value);
        this.pos += 8;
    };
    Encoder.prototype.writeBigUint64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setBigUint64(this.pos, value);
        this.pos += 8;
    };
    Encoder.prototype.writeBigInt64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setBigInt64(this.pos, value);
        this.pos += 8;
    };
    return Encoder;
}());
export { Encoder };
//# sourceMappingURL=Encoder.mjs.map