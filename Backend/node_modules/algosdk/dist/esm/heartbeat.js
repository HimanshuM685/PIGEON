import { AddressSchema, Uint64Schema, ByteArraySchema, FixedLengthByteArraySchema, NamedMapSchema, allOmitEmpty, } from './encoding/schema/index.js';
export class HeartbeatProof {
    constructor(params) {
        this.sig = params.sig;
        this.pk = params.pk;
        this.pk2 = params.pk2;
        this.pk1Sig = params.pk1Sig;
        this.pk2Sig = params.pk2Sig;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return HeartbeatProof.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['s', this.sig],
            ['p', this.pk],
            ['p2', this.pk2],
            ['p1s', this.pk1Sig],
            ['p2s', this.pk2Sig],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded HeartbeatProof: ${data}`);
        }
        return new HeartbeatProof({
            sig: data.get('s'),
            pk: data.get('p'),
            pk2: data.get('p2'),
            pk1Sig: data.get('p1s'),
            pk2Sig: data.get('p2s'),
        });
    }
}
HeartbeatProof.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 's', // Sig
        valueSchema: new FixedLengthByteArraySchema(64),
    },
    {
        key: 'p', // PK
        valueSchema: new FixedLengthByteArraySchema(32),
    },
    {
        key: 'p2', // PK2
        valueSchema: new FixedLengthByteArraySchema(32),
    },
    {
        key: 'p1s', // PK1Sig
        valueSchema: new FixedLengthByteArraySchema(64),
    },
    {
        key: 'p2s', // PK2Sig
        valueSchema: new FixedLengthByteArraySchema(64),
    },
]));
export class Heartbeat {
    constructor(params) {
        this.address = params.address;
        this.proof = params.proof;
        this.seed = params.seed;
        this.voteID = params.voteID;
        this.keyDilution = params.keyDilution;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return Heartbeat.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['a', this.address],
            ['prf', this.proof.toEncodingData()],
            ['sd', this.seed],
            ['vid', this.voteID],
            ['kd', this.keyDilution],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded Heartbeat: ${data}`);
        }
        return new Heartbeat({
            address: data.get('a'),
            proof: HeartbeatProof.fromEncodingData(data.get('prf')),
            seed: data.get('sd'),
            voteID: data.get('vid'),
            keyDilution: data.get('kd'),
        });
    }
}
Heartbeat.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'a', // HbAddress
        valueSchema: new AddressSchema(),
    },
    {
        key: 'prf', // HbProof
        valueSchema: HeartbeatProof.encodingSchema,
    },
    {
        key: 'sd', // HbSeed
        valueSchema: new ByteArraySchema(),
    },
    {
        key: 'vid', // HbVoteID
        valueSchema: new FixedLengthByteArraySchema(32),
    },
    {
        key: 'kd', // HbKeyDilution
        valueSchema: new Uint64Schema(),
    },
]));
//# sourceMappingURL=heartbeat.js.map