import { encodeMsgpack, decodeMsgpack, } from './encoding/encoding.js';
import { Transaction } from './transaction.js';
import { LogicSig } from './logicsig.js';
import { encodedMultiSigToEncodingData, encodedMultiSigFromEncodingData, ENCODED_MULTISIG_SCHEMA, } from './types/transactions/index.js';
import { AddressSchema, FixedLengthByteArraySchema, OptionalSchema, NamedMapSchema, allOmitEmpty, } from './encoding/schema/index.js';
export class SignedTransaction {
    constructor({ txn, sig, msig, lsig, sgnr, }) {
        this.txn = txn;
        this.sig = sig;
        this.msig = msig;
        this.lsig = lsig;
        this.sgnr = sgnr;
        let numberOfSigs = 0;
        if (sig)
            numberOfSigs += 1;
        if (msig)
            numberOfSigs += 1;
        if (lsig)
            numberOfSigs += 1;
        if (numberOfSigs > 1) {
            throw new Error(`SignedTransaction must not have more than 1 signature. Got ${numberOfSigs}`);
        }
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return SignedTransaction.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['txn', this.txn.toEncodingData()],
            ['sig', this.sig],
            [
                'msig',
                this.msig ? encodedMultiSigToEncodingData(this.msig) : undefined,
            ],
            ['lsig', this.lsig ? this.lsig.toEncodingData() : undefined],
            ['sgnr', this.sgnr],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded SignedTransaction: ${data}`);
        }
        return new SignedTransaction({
            txn: Transaction.fromEncodingData(data.get('txn')),
            sig: data.get('sig'),
            msig: data.get('msig')
                ? encodedMultiSigFromEncodingData(data.get('msig'))
                : undefined,
            lsig: data.get('lsig')
                ? LogicSig.fromEncodingData(data.get('lsig'))
                : undefined,
            sgnr: data.get('sgnr'),
        });
    }
}
SignedTransaction.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'txn',
        valueSchema: Transaction.encodingSchema,
    },
    {
        key: 'sig',
        valueSchema: new OptionalSchema(new FixedLengthByteArraySchema(64)),
    },
    {
        key: 'msig',
        valueSchema: new OptionalSchema(ENCODED_MULTISIG_SCHEMA),
    },
    {
        key: 'lsig',
        valueSchema: new OptionalSchema(LogicSig.encodingSchema),
    },
    {
        key: 'sgnr',
        valueSchema: new OptionalSchema(new AddressSchema()),
    },
]));
/**
 * decodeSignedTransaction takes a Uint8Array (from transaction.signTxn) and converts it to an object
 * containing the Transaction (txn), the signature (sig), and the auth-addr field if applicable (sgnr)
 * @param transactionBuffer - the Uint8Array containing a transaction
 * @returns containing a Transaction, the signature, and possibly an auth-addr field
 */
export function decodeSignedTransaction(transactionBuffer) {
    return decodeMsgpack(transactionBuffer, SignedTransaction);
}
/**
 * encodeUnsignedSimulateTransaction takes a txnBuilder.Transaction object,
 * converts it into a SignedTransaction-like object, and converts it to a Buffer.
 *
 * Note: this function should only be used to simulate unsigned transactions.
 *
 * @param txn - Transaction object to simulate.
 */
export function encodeUnsignedSimulateTransaction(txn) {
    const stxn = new SignedTransaction({ txn });
    return encodeMsgpack(stxn);
}
//# sourceMappingURL=signedTransaction.js.map