import nacl from 'tweetnacl';
import sha512 from 'js-sha512';
import { isReactNative } from '../utils/utils.js';
export function genericHash(arr) {
    return sha512.sha512_256.array(arr);
}
export function randomBytes(length) {
    if (isReactNative()) {
        console.warn(`It looks like you're running in react-native. In order to perform common crypto operations you will need to polyfill common operations such as crypto.getRandomValues`);
    }
    return nacl.randomBytes(length);
}
export function keyPairFromSeed(seed) {
    return nacl.sign.keyPair.fromSeed(seed);
}
export function keyPair() {
    const seed = randomBytes(nacl.box.secretKeyLength);
    return keyPairFromSeed(seed);
}
export function isValidSignatureLength(len) {
    return len === nacl.sign.signatureLength;
}
export function keyPairFromSecretKey(sk) {
    return nacl.sign.keyPair.fromSecretKey(sk);
}
export function sign(msg, secretKey) {
    return nacl.sign.detached(msg, secretKey);
}
export function bytesEqual(a, b) {
    return nacl.verify(a, b);
}
export function verify(message, signature, verifyKey) {
    return nacl.sign.detached.verify(message, signature, verifyKey);
}
// constants
export const PUBLIC_KEY_LENGTH = nacl.sign.publicKeyLength;
export const SECRET_KEY_LENGTH = nacl.sign.secretKeyLength;
export const HASH_BYTES_LENGTH = 32;
export const SEED_BTYES_LENGTH = 32;
//# sourceMappingURL=naclWrappers.js.map