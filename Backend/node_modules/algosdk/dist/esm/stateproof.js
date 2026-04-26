import { Uint64Schema, ByteArraySchema, FixedLengthByteArraySchema, ArraySchema, NamedMapSchema, Uint64MapSchema, allOmitEmpty, convertMap, } from './encoding/schema/index.js';
export class HashFactory {
    constructor(params) {
        this.hashType = params.hashType;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return HashFactory.encodingSchema;
    }
    toEncodingData() {
        return new Map([['t', this.hashType]]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded HashFactory: ${data}`);
        }
        return new HashFactory({
            hashType: Number(data.get('t')),
        });
    }
}
HashFactory.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 't', valueSchema: new Uint64Schema() }, // hashType
]));
export class MerkleArrayProof {
    constructor(params) {
        this.path = params.path;
        this.hashFactory = params.hashFactory;
        this.treeDepth = params.treeDepth;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return MerkleArrayProof.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['pth', this.path],
            ['hsh', this.hashFactory.toEncodingData()],
            ['td', this.treeDepth],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded MerkleArrayProof: ${data}`);
        }
        return new MerkleArrayProof({
            path: data.get('pth'),
            hashFactory: HashFactory.fromEncodingData(data.get('hsh')),
            treeDepth: Number(data.get('td')),
        });
    }
}
MerkleArrayProof.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'pth', // path
        valueSchema: new ArraySchema(new ByteArraySchema()),
    },
    {
        key: 'hsh', // hashFactory
        valueSchema: HashFactory.encodingSchema,
    },
    {
        key: 'td', // treeDepth
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * MerkleSignatureVerifier is used to verify a merkle signature.
 */
export class MerkleSignatureVerifier {
    constructor(params) {
        this.commitment = params.commitment;
        this.keyLifetime = params.keyLifetime;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return MerkleSignatureVerifier.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['cmt', this.commitment],
            ['lf', this.keyLifetime],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded MerkleSignatureVerifier: ${data}`);
        }
        return new MerkleSignatureVerifier({
            commitment: data.get('cmt'),
            keyLifetime: data.get('lf'),
        });
    }
}
MerkleSignatureVerifier.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'cmt', // commitment
        valueSchema: new FixedLengthByteArraySchema(64),
    },
    {
        key: 'lf', // keyLifetime
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * A Participant corresponds to an account whose AccountData.Status is Online, and for which the
 * expected sigRound satisfies AccountData.VoteFirstValid <= sigRound <= AccountData.VoteLastValid.
 *
 * In the Algorand ledger, it is possible for multiple accounts to have the same PK. Thus, the PK is
 * not necessarily unique among Participants. However, each account will produce a unique Participant
 * struct, to avoid potential DoS attacks where one account claims to have the same VoteID PK as
 * another account.
 */
export class Participant {
    constructor(params) {
        this.pk = params.pk;
        this.weight = params.weight;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return Participant.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['p', this.pk.toEncodingData()],
            ['w', this.weight],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded Participant: ${data}`);
        }
        return new Participant({
            pk: MerkleSignatureVerifier.fromEncodingData(data.get('p')),
            weight: data.get('w'),
        });
    }
}
Participant.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'p', // pk
        valueSchema: MerkleSignatureVerifier.encodingSchema,
    },
    {
        key: 'w', // weight
        valueSchema: new Uint64Schema(),
    },
]));
export class FalconVerifier {
    constructor(params) {
        this.publicKey = params.publicKey;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return FalconVerifier.encodingSchema;
    }
    toEncodingData() {
        return new Map([['k', this.publicKey]]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded FalconVerifier: ${data}`);
        }
        return new FalconVerifier({
            publicKey: data.get('k'),
        });
    }
}
FalconVerifier.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'k', valueSchema: new FixedLengthByteArraySchema(0x701) }, // publicKey
]));
/**
 * FalconSignatureStruct represents a signature in the merkle signature scheme using falcon signatures
 * as an underlying crypto scheme. It consists of an ephemeral public key, a signature, a merkle
 * verification path and an index. The merkle signature considered valid only if the Signature is
 * verified under the ephemeral public key and the Merkle verification path verifies that the
 * ephemeral public key is located at the given index of the tree (for the root given in the
 * long-term public key). More details can be found on Algorand's spec
 */
export class FalconSignatureStruct {
    constructor(params) {
        this.signature = params.signature;
        this.vectorCommitmentIndex = params.index;
        this.proof = params.proof;
        this.verifyingKey = params.verifyingKey;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return FalconSignatureStruct.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['sig', this.signature],
            ['idx', this.vectorCommitmentIndex],
            ['prf', this.proof.toEncodingData()],
            ['vkey', this.verifyingKey.toEncodingData()],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded FalconSignatureStruct: ${data}`);
        }
        return new FalconSignatureStruct({
            signature: data.get('sig'),
            index: data.get('idx'),
            proof: MerkleArrayProof.fromEncodingData(data.get('prf')),
            verifyingKey: FalconVerifier.fromEncodingData(data.get('vkey')),
        });
    }
}
FalconSignatureStruct.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'sig', valueSchema: new ByteArraySchema() }, // signature
    { key: 'idx', valueSchema: new Uint64Schema() }, // index
    { key: 'prf', valueSchema: MerkleArrayProof.encodingSchema }, // proof
    { key: 'vkey', valueSchema: FalconVerifier.encodingSchema }, // verifyingKey
]));
/**
 * A SigslotCommit is a single slot in the sigs array that forms the state proof.
 */
export class SigslotCommit {
    constructor(params) {
        this.sig = params.sig;
        this.l = params.l;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return SigslotCommit.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['s', this.sig.toEncodingData()],
            ['l', this.l],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded SigslotCommit: ${data}`);
        }
        return new SigslotCommit({
            sig: FalconSignatureStruct.fromEncodingData(data.get('s')),
            l: data.get('l'),
        });
    }
}
SigslotCommit.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 's', valueSchema: FalconSignatureStruct.encodingSchema }, // sigslot
    { key: 'l', valueSchema: new Uint64Schema() }, // l
]));
/**
 * Reveal is a single array position revealed as part of a state proof. It reveals an element of the
 * signature array and the corresponding element of the participants array.
 */
export class Reveal {
    constructor(params) {
        this.sigslot = params.sigslot;
        this.participant = params.participant;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return Reveal.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['s', this.sigslot.toEncodingData()],
            ['p', this.participant.toEncodingData()],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded Reveal: ${data}`);
        }
        return new Reveal({
            sigslot: SigslotCommit.fromEncodingData(data.get('s')),
            participant: Participant.fromEncodingData(data.get('p')),
        });
    }
}
Reveal.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 's', valueSchema: SigslotCommit.encodingSchema }, // sigslotCommit
    { key: 'p', valueSchema: Participant.encodingSchema }, // participant
]));
export class StateProof {
    constructor(params) {
        this.sigCommit = params.sigCommit;
        this.signedWeight = params.signedWeight;
        this.sigProofs = params.sigProofs;
        this.partProofs = params.partProofs;
        this.merkleSignatureSaltVersion = params.merkleSignatureSaltVersion;
        this.reveals = params.reveals;
        this.positionsToReveal = params.positionsToReveal;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return StateProof.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['c', this.sigCommit],
            ['w', this.signedWeight],
            ['S', this.sigProofs.toEncodingData()],
            ['P', this.partProofs.toEncodingData()],
            ['v', this.merkleSignatureSaltVersion],
            [
                'r',
                convertMap(this.reveals, (key, value) => [key, value.toEncodingData()]),
            ],
            ['pr', this.positionsToReveal],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded StateProof: ${data}`);
        }
        return new StateProof({
            sigCommit: data.get('c'),
            signedWeight: data.get('w'),
            sigProofs: MerkleArrayProof.fromEncodingData(data.get('S')),
            partProofs: MerkleArrayProof.fromEncodingData(data.get('P')),
            merkleSignatureSaltVersion: Number(data.get('v')),
            reveals: convertMap(data.get('r'), (key, value) => [
                key,
                Reveal.fromEncodingData(value),
            ]),
            positionsToReveal: data.get('pr'),
        });
    }
}
StateProof.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'c', // sigCommit
        valueSchema: new ByteArraySchema(),
    },
    {
        key: 'w', // signedWeight
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'S', // sigProofs
        valueSchema: MerkleArrayProof.encodingSchema,
    },
    {
        key: 'P', // partProofs
        valueSchema: MerkleArrayProof.encodingSchema,
    },
    {
        key: 'v', // merkleSignatureSaltVersion
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'r', // reveals
        valueSchema: new Uint64MapSchema(Reveal.encodingSchema),
    },
    {
        key: 'pr', // positionsToReveal
        valueSchema: new ArraySchema(new Uint64Schema()),
    },
]));
export class StateProofMessage {
    constructor(params) {
        this.blockHeadersCommitment = params.blockHeadersCommitment;
        this.votersCommitment = params.votersCommitment;
        this.lnProvenWeight = params.lnProvenWeight;
        this.firstAttestedRound = params.firstAttestedRound;
        this.lastAttestedRound = params.lastAttestedRound;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return StateProofMessage.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['b', this.blockHeadersCommitment],
            ['v', this.votersCommitment],
            ['P', this.lnProvenWeight],
            ['f', this.firstAttestedRound],
            ['l', this.lastAttestedRound],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded StateProofMessage: ${data}`);
        }
        return new StateProofMessage({
            blockHeadersCommitment: data.get('b'),
            votersCommitment: data.get('v'),
            lnProvenWeight: data.get('P'),
            firstAttestedRound: data.get('f'),
            lastAttestedRound: data.get('l'),
        });
    }
    static fromMap(data) {
        return new StateProofMessage({
            blockHeadersCommitment: data.get('b'),
            votersCommitment: data.get('v'),
            lnProvenWeight: data.get('P'),
            firstAttestedRound: data.get('f'),
            lastAttestedRound: data.get('l'),
        });
    }
}
StateProofMessage.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'b', valueSchema: new ByteArraySchema() }, // blockHeadersCommitment
    { key: 'v', valueSchema: new ByteArraySchema() }, // votersCommitment
    { key: 'P', valueSchema: new Uint64Schema() }, // lnProvenWeight
    { key: 'f', valueSchema: new Uint64Schema() }, // firstAttestedRound
    { key: 'l', valueSchema: new Uint64Schema() }, // lastAttestedRound
]));
//# sourceMappingURL=stateproof.js.map