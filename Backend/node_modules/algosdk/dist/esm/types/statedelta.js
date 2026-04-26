import { NamedMapSchema, Uint64MapSchema, ByteArrayMapSchema, SpecialCaseBinaryStringMapSchema, SpecialCaseBinaryStringSchema, ArraySchema, BooleanSchema, Uint64Schema, AddressSchema, ByteArraySchema, FixedLengthByteArraySchema, OptionalSchema, UntypedSchema, allOmitEmpty, convertMap, combineMaps, } from '../encoding/schema/index.js';
import { BlockHeader } from './block.js';
import { UntypedValue } from '../client/v2/untypedmodel.js';
// TealValue contains type information and a value, representing a value in a TEAL program
export class TealValue {
    constructor(params) {
        this.type = params.type;
        this.bytes = params.bytes;
        this.uint = params.uint;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return TealValue.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['tt', this.type],
            ['tb', this.bytes],
            ['ui', this.uint],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded TealValue: ${data}`);
        }
        return new TealValue({
            type: Number(data.get('tt')),
            bytes: data.get('tb'),
            uint: data.get('ui'),
        });
    }
}
TealValue.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'tt', valueSchema: new Uint64Schema() }, // type
    {
        key: 'tb', // bytes
        valueSchema: new OptionalSchema(new SpecialCaseBinaryStringSchema()),
    },
    { key: 'ui', valueSchema: new OptionalSchema(new Uint64Schema()) }, // uint
]));
/**
 * StateSchema sets maximums on the number of each type that may be stored
 */
export class StateSchema {
    constructor(params) {
        this.numUints = params.numUints;
        this.numByteSlices = params.numByteSlices;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return StateSchema.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['nui', this.numUints],
            ['nbs', this.numByteSlices],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded StateSchema: ${data}`);
        }
        return new StateSchema({
            numUints: Number(data.get('nui')),
            numByteSlices: Number(data.get('nbs')),
        });
    }
}
StateSchema.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'nui', // numUints
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'nbs', // numByteSlices
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * AppParams stores the global information associated with an application
 */
export class AppParams {
    constructor(params) {
        this.approvalProgram = params.approvalProgram;
        this.clearStateProgram = params.clearStateProgram;
        this.globalState = params.globalState;
        this.localStateSchema = params.localStateSchema;
        this.globalStateSchema = params.globalStateSchema;
        this.extraProgramPages = params.extraProgramPages;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AppParams.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['approv', this.approvalProgram],
            ['clearp', this.clearStateProgram],
            ['gs', convertMap(this.globalState, (k, v) => [k, v.toEncodingData()])],
            ['lsch', this.localStateSchema.toEncodingData()],
            ['gsch', this.globalStateSchema.toEncodingData()],
            ['epp', this.extraProgramPages],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AppParams: ${data}`);
        }
        return new AppParams({
            approvalProgram: data.get('approv'),
            clearStateProgram: data.get('clearp'),
            globalState: convertMap(data.get('gs'), (k, v) => [k, TealValue.fromEncodingData(v)]),
            localStateSchema: StateSchema.fromEncodingData(data.get('lsch')),
            globalStateSchema: StateSchema.fromEncodingData(data.get('gsch')),
            extraProgramPages: Number(data.get('epp')),
        });
    }
}
AppParams.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'approv', valueSchema: new ByteArraySchema() }, // approvalProgram
    { key: 'clearp', valueSchema: new ByteArraySchema() }, // alearStateProgram
    {
        key: 'gs',
        valueSchema: new SpecialCaseBinaryStringMapSchema(TealValue.encodingSchema),
    }, // globalState
    { key: 'lsch', valueSchema: StateSchema.encodingSchema }, // localStateSchema
    { key: 'gsch', valueSchema: StateSchema.encodingSchema }, // globalStateSchema
    { key: 'epp', valueSchema: new Uint64Schema() }, // extraProgramPages
]));
/**
 * AppLocalState stores the LocalState associated with an application.
 */
export class AppLocalState {
    constructor(params) {
        this.schema = params.schema;
        this.keyValue = params.keyValue;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AppLocalState.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['hsch', this.schema.toEncodingData()],
            ['tkv', convertMap(this.keyValue, (k, v) => [k, v.toEncodingData()])],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AppLocalState: ${data}`);
        }
        return new AppLocalState({
            schema: StateSchema.fromEncodingData(data.get('hsch')),
            keyValue: convertMap(data.get('tkv'), (k, v) => [k, TealValue.fromEncodingData(v)]),
        });
    }
}
AppLocalState.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'hsch', valueSchema: StateSchema.encodingSchema }, // schema
    {
        key: 'tkv', // keyValue
        valueSchema: new SpecialCaseBinaryStringMapSchema(TealValue.encodingSchema),
    },
]));
/**
 * AppLocalStateDelta tracks a changed AppLocalState, and whether it was deleted
 */
export class AppLocalStateDelta {
    constructor(params) {
        this.localState = params.localState;
        this.deleted = params.deleted;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AppLocalStateDelta.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            [
                'LocalState',
                this.localState ? this.localState.toEncodingData() : undefined,
            ],
            ['Deleted', this.deleted],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AppLocalStateDelta: ${data}`);
        }
        return new AppLocalStateDelta({
            localState: data.get('LocalState')
                ? AppLocalState.fromEncodingData(data.get('LocalState'))
                : undefined,
            deleted: data.get('Deleted'),
        });
    }
}
AppLocalStateDelta.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'LocalState', // localState
        valueSchema: new OptionalSchema(AppLocalState.encodingSchema),
    },
    { key: 'Deleted', valueSchema: new BooleanSchema() }, // deleted
]));
/**
 * AppParamsDelta tracks a changed AppParams, and whether it was deleted
 */
export class AppParamsDelta {
    constructor(params) {
        this.params = params.params;
        this.deleted = params.deleted;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AppParamsDelta.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Params', this.params ? this.params.toEncodingData() : undefined],
            ['Deleted', this.deleted],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AppParamsDelta: ${data}`);
        }
        return new AppParamsDelta({
            params: data.get('Params')
                ? AppParams.fromEncodingData(data.get('Params'))
                : undefined,
            deleted: data.get('Deleted'),
        });
    }
}
AppParamsDelta.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Params', // params
        valueSchema: new OptionalSchema(AppParams.encodingSchema),
    },
    { key: 'Deleted', valueSchema: new BooleanSchema() }, // deleted
]));
/**
 * AppResourceRecord represents AppParams and AppLocalState in deltas
 */
export class AppResourceRecord {
    constructor(params) {
        this.id = params.id;
        this.address = params.address;
        this.params = params.params;
        this.state = params.state;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AppResourceRecord.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Aidx', this.id],
            ['Addr', this.address],
            ['Params', this.params.toEncodingData()],
            ['State', this.state.toEncodingData()],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AppResourceRecord: ${data}`);
        }
        return new AppResourceRecord({
            id: data.get('Aidx'),
            address: data.get('Addr'),
            params: AppParamsDelta.fromEncodingData(data.get('Params')),
            state: AppLocalStateDelta.fromEncodingData(data.get('State')),
        });
    }
}
AppResourceRecord.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'Aidx', valueSchema: new Uint64Schema() }, // id
    { key: 'Addr', valueSchema: new AddressSchema() }, // address
    {
        key: 'Params', // params
        valueSchema: AppParamsDelta.encodingSchema,
    },
    {
        key: 'State', // state
        valueSchema: AppLocalStateDelta.encodingSchema,
    },
]));
/**
 * AssetHolding describes an asset held by an account.
 */
export class AssetHolding {
    constructor(params) {
        this.amount = params.amount;
        this.frozen = params.frozen;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AssetHolding.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['a', this.amount],
            ['f', this.frozen],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AssetHolding: ${data}`);
        }
        return new AssetHolding({
            amount: data.get('a'),
            frozen: data.get('f'),
        });
    }
}
AssetHolding.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'a', valueSchema: new Uint64Schema() }, // amount
    { key: 'f', valueSchema: new BooleanSchema() }, // frozen
]));
/**
 * AssetHoldingDelta records a changed AssetHolding, and whether it was deleted
 */
export class AssetHoldingDelta {
    constructor(params) {
        this.holding = params.holding;
        this.deleted = params.deleted;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AssetHoldingDelta.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Holding', this.holding ? this.holding.toEncodingData() : undefined],
            ['Deleted', this.deleted],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AssetHoldingDelta: ${data}`);
        }
        return new AssetHoldingDelta({
            holding: data.get('Holding')
                ? AssetHolding.fromEncodingData(data.get('Holding'))
                : undefined,
            deleted: data.get('Deleted'),
        });
    }
}
AssetHoldingDelta.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Holding', // holding
        valueSchema: new OptionalSchema(AssetHolding.encodingSchema),
    },
    { key: 'Deleted', valueSchema: new BooleanSchema() }, // deleted
]));
/**
 * AssetParams describes the parameters of an asset.
 */
export class AssetParams {
    constructor(params) {
        this.total = params.total;
        this.decimals = params.decimals;
        this.defaultFrozen = params.defaultFrozen;
        this.unitName = params.unitName;
        this.assetName = params.assetName;
        this.url = params.url;
        this.metadataHash = params.metadataHash;
        this.manager = params.manager;
        this.reserve = params.reserve;
        this.freeze = params.freeze;
        this.clawback = params.clawback;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AssetParams.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['t', this.total],
            ['dc', this.decimals],
            ['df', this.defaultFrozen],
            ['un', this.unitName],
            ['an', this.assetName],
            ['au', this.url],
            ['am', this.metadataHash],
            ['m', this.manager],
            ['r', this.reserve],
            ['f', this.freeze],
            ['c', this.clawback],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AssetParams: ${data}`);
        }
        return new AssetParams({
            total: data.get('t'),
            decimals: data.get('dc'),
            defaultFrozen: data.get('df'),
            unitName: data.get('un'),
            assetName: data.get('an'),
            url: data.get('au'),
            metadataHash: data.get('am'),
            manager: data.get('m'),
            reserve: data.get('r'),
            freeze: data.get('f'),
            clawback: data.get('c'),
        });
    }
}
AssetParams.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 't', valueSchema: new Uint64Schema() }, // total
    { key: 'dc', valueSchema: new Uint64Schema() }, // decimals
    { key: 'df', valueSchema: new BooleanSchema() }, // defaultFrozen
    {
        key: 'un', // unitName
        valueSchema: new OptionalSchema(new SpecialCaseBinaryStringSchema()),
    },
    {
        key: 'an', // assetName
        valueSchema: new OptionalSchema(new SpecialCaseBinaryStringSchema()),
    },
    {
        key: 'au', // url
        valueSchema: new OptionalSchema(new SpecialCaseBinaryStringSchema()),
    },
    { key: 'am', valueSchema: new FixedLengthByteArraySchema(32) }, // metadataHash
    { key: 'm', valueSchema: new OptionalSchema(new AddressSchema()) }, // manager
    { key: 'r', valueSchema: new OptionalSchema(new AddressSchema()) }, // reserve
    { key: 'f', valueSchema: new OptionalSchema(new AddressSchema()) }, // freeze
    { key: 'c', valueSchema: new OptionalSchema(new AddressSchema()) }, // clawback
]));
/**
 * AssetParamsDelta tracks a changed AssetParams, and whether it was deleted
 */
export class AssetParamsDelta {
    constructor(params) {
        this.params = params.params;
        this.deleted = params.deleted;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AssetParamsDelta.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Params', this.params ? this.params.toEncodingData() : undefined],
            ['Deleted', this.deleted],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AssetParamsDelta: ${data}`);
        }
        return new AssetParamsDelta({
            params: data.get('Params')
                ? AssetParams.fromEncodingData(data.get('Params'))
                : undefined,
            deleted: data.get('Deleted'),
        });
    }
}
AssetParamsDelta.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Params', // params
        valueSchema: new OptionalSchema(AssetParams.encodingSchema),
    },
    { key: 'Deleted', valueSchema: new BooleanSchema() }, // deleted
]));
/**
 * AssetResourceRecord represents AssetParams and AssetHolding in deltas
 */
export class AssetResourceRecord {
    constructor(params) {
        this.id = params.id;
        this.address = params.address;
        this.params = params.params;
        this.holding = params.holding;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AssetResourceRecord.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Aidx', this.id],
            ['Addr', this.address],
            ['Params', this.params.toEncodingData()],
            ['Holding', this.holding.toEncodingData()],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AssetResourceRecord: ${data}`);
        }
        return new AssetResourceRecord({
            id: data.get('Aidx'),
            address: data.get('Addr'),
            params: AssetParamsDelta.fromEncodingData(data.get('Params')),
            holding: AssetHoldingDelta.fromEncodingData(data.get('Holding')),
        });
    }
}
AssetResourceRecord.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'Aidx', valueSchema: new Uint64Schema() }, // id
    { key: 'Addr', valueSchema: new AddressSchema() }, // address
    {
        key: 'Params', // params
        valueSchema: AssetParamsDelta.encodingSchema,
    },
    {
        key: 'Holding', // holding
        valueSchema: AssetHoldingDelta.encodingSchema,
    },
]));
/**
 * VotingData holds participation information
 */
export class VotingData {
    constructor(params) {
        this.voteID = params.voteID;
        this.selectionID = params.selectionID;
        this.stateProofID = params.stateProofID;
        this.voteFirstValid = params.voteFirstValid;
        this.voteLastValid = params.voteLastValid;
        this.voteKeyDilution = params.voteKeyDilution;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return VotingData.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['VoteID', this.voteID],
            ['SelectionID', this.selectionID],
            ['StateProofID', this.stateProofID],
            ['VoteFirstValid', this.voteFirstValid],
            ['VoteLastValid', this.voteLastValid],
            ['VoteKeyDilution', this.voteKeyDilution],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded VotingData: ${data}`);
        }
        return new VotingData({
            voteID: data.get('VoteID'),
            selectionID: data.get('SelectionID'),
            stateProofID: data.get('StateProofID'),
            voteFirstValid: data.get('VoteFirstValid'),
            voteLastValid: data.get('VoteLastValid'),
            voteKeyDilution: data.get('VoteKeyDilution'),
        });
    }
}
VotingData.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'VoteID', // voteID
        valueSchema: new FixedLengthByteArraySchema(32),
    },
    {
        key: 'SelectionID', // selectionID
        valueSchema: new FixedLengthByteArraySchema(32),
    },
    {
        key: 'StateProofID', // stateProofID
        valueSchema: new FixedLengthByteArraySchema(64),
    },
    {
        key: 'VoteFirstValid', // voteFirstValid
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'VoteLastValid', // voteLastValid
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'VoteKeyDilution', // voteKeyDilution
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * AccountBaseData contains base account info like balance, status and total number of resources
 */
export class AccountBaseData {
    constructor(params) {
        this.status = params.status;
        this.microAlgos = params.microAlgos;
        this.rewardsBase = params.rewardsBase;
        this.rewardedMicroAlgos = params.rewardedMicroAlgos;
        this.authAddr = params.authAddr;
        this.incentiveEligible = params.incentiveEligible;
        this.totalAppSchema = params.totalAppSchema;
        this.totalExtraAppPages = params.totalExtraAppPages;
        this.totalAppParams = params.totalAppParams;
        this.totalAppLocalStates = params.totalAppLocalStates;
        this.totalAssetParams = params.totalAssetParams;
        this.totalAssets = params.totalAssets;
        this.totalBoxes = params.totalBoxes;
        this.totalBoxBytes = params.totalBoxBytes;
        this.lastProposed = params.lastProposed;
        this.lastHeartbeat = params.lastHeartbeat;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AccountBaseData.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Status', this.status],
            ['MicroAlgos', this.microAlgos],
            ['RewardsBase', this.rewardsBase],
            ['RewardedMicroAlgos', this.rewardedMicroAlgos],
            ['AuthAddr', this.authAddr],
            ['IncentiveEligible', this.incentiveEligible],
            ['TotalAppSchema', this.totalAppSchema.toEncodingData()],
            ['TotalExtraAppPages', this.totalExtraAppPages],
            ['TotalAppParams', this.totalAppParams],
            ['TotalAppLocalStates', this.totalAppLocalStates],
            ['TotalAssetParams', this.totalAssetParams],
            ['TotalAssets', this.totalAssets],
            ['TotalBoxes', this.totalBoxes],
            ['TotalBoxBytes', this.totalBoxBytes],
            ['LastProposed', this.lastProposed],
            ['LastHeartbeat', this.lastHeartbeat],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AccountBaseData: ${data}`);
        }
        return new AccountBaseData({
            status: Number(data.get('Status')),
            microAlgos: data.get('MicroAlgos'),
            rewardsBase: data.get('RewardsBase'),
            rewardedMicroAlgos: data.get('RewardedMicroAlgos'),
            authAddr: data.get('AuthAddr'),
            incentiveEligible: data.get('IncentiveEligible'),
            totalAppSchema: StateSchema.fromEncodingData(data.get('TotalAppSchema')),
            totalExtraAppPages: Number(data.get('TotalExtraAppPages')),
            totalAppParams: data.get('TotalAppParams'),
            totalAppLocalStates: data.get('TotalAppLocalStates'),
            totalAssetParams: data.get('TotalAssetParams'),
            totalAssets: data.get('TotalAssets'),
            totalBoxes: data.get('TotalBoxes'),
            totalBoxBytes: data.get('TotalBoxBytes'),
            lastProposed: data.get('LastProposed'),
            lastHeartbeat: data.get('LastHeartbeat'),
        });
    }
}
AccountBaseData.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'Status', valueSchema: new Uint64Schema() }, // status
    { key: 'MicroAlgos', valueSchema: new Uint64Schema() }, // microAlgos
    { key: 'RewardsBase', valueSchema: new Uint64Schema() }, // rewardsBase
    {
        key: 'RewardedMicroAlgos', // rewardedMicroAlgos
        valueSchema: new Uint64Schema(),
    },
    { key: 'AuthAddr', valueSchema: new AddressSchema() }, // authAddr
    {
        key: 'IncentiveEligible', // incentiveEligible
        valueSchema: new BooleanSchema(),
    },
    {
        key: 'TotalAppSchema', // totalAppSchema
        valueSchema: StateSchema.encodingSchema,
    },
    {
        key: 'TotalExtraAppPages', // totalExtraAppPages
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'TotalAppParams', // totalAppParams
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'TotalAppLocalStates', // totalAppLocalStates
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'TotalAssetParams', // totalAssetParams
        valueSchema: new Uint64Schema(),
    },
    { key: 'TotalAssets', valueSchema: new Uint64Schema() }, // totalAssets
    { key: 'TotalBoxes', valueSchema: new Uint64Schema() }, // totalBoxes
    {
        key: 'TotalBoxBytes', // totalBoxBytes
        valueSchema: new Uint64Schema(),
    },
    { key: 'LastProposed', valueSchema: new Uint64Schema() }, // lastProposed
    {
        key: 'LastHeartbeat', // lastHeartbeat
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * AccountData provides per-account data
 */
export class AccountData {
    constructor(params) {
        this.accountBaseData = params.accountBaseData;
        this.votingData = params.votingData;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AccountData.encodingSchema;
    }
    toEncodingData() {
        return combineMaps(this.accountBaseData.toEncodingData(), this.votingData.toEncodingData());
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AccountData: ${data}`);
        }
        return new AccountData({
            accountBaseData: AccountBaseData.fromEncodingData(data),
            votingData: VotingData.fromEncodingData(data),
        });
    }
}
AccountData.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: '',
        valueSchema: AccountBaseData.encodingSchema,
        embedded: true,
    },
    {
        key: '',
        valueSchema: VotingData.encodingSchema,
        embedded: true,
    },
]));
export class BalanceRecord {
    constructor(params) {
        this.addr = params.addr;
        this.accountData = params.accountData;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return BalanceRecord.encodingSchema;
    }
    toEncodingData() {
        return combineMaps(new Map([['Addr', this.addr]]), this.accountData.toEncodingData());
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded BalanceRecord: ${data}`);
        }
        return new BalanceRecord({
            addr: data.get('Addr'),
            accountData: AccountData.fromEncodingData(data),
        });
    }
}
BalanceRecord.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Addr',
        valueSchema: new AddressSchema(),
    },
    {
        key: '',
        valueSchema: AccountData.encodingSchema,
        embedded: true,
    },
]));
export class AccountDeltas {
    constructor(params) {
        this.accounts = params.accounts;
        this.appResources = params.appResources;
        this.assetResources = params.assetResources;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AccountDeltas.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Accts', this.accounts.map((account) => account.toEncodingData())],
            [
                'AppResources',
                this.appResources.length === 0
                    ? undefined
                    : this.appResources.map((appResource) => appResource.toEncodingData()),
            ],
            [
                'AssetResources',
                this.assetResources.length === 0
                    ? undefined
                    : this.assetResources.map((assetResource) => assetResource.toEncodingData()),
            ],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AccountDeltas: ${data}`);
        }
        return new AccountDeltas({
            accounts: (data.get('Accts') ?? []).map(BalanceRecord.fromEncodingData),
            appResources: (data.get('AppResources') ?? []).map(AppResourceRecord.fromEncodingData),
            assetResources: (data.get('AssetResources') ?? []).map(AssetResourceRecord.fromEncodingData),
        });
    }
}
AccountDeltas.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Accts', // accounts
        valueSchema: new ArraySchema(BalanceRecord.encodingSchema),
    },
    {
        key: 'AppResources', // appResources
        valueSchema: new OptionalSchema(new ArraySchema(AppResourceRecord.encodingSchema)),
    },
    {
        key: 'AssetResources', // assetResources
        valueSchema: new OptionalSchema(new ArraySchema(AssetResourceRecord.encodingSchema)),
    },
]));
/**
 * A KvValueDelta shows how the Data associated with a key in the kvstore has changed.
 */
export class KvValueDelta {
    constructor(params) {
        this.data = params.data;
        this.oldData = params.oldData;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return KvValueDelta.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Data', this.data],
            ['OldData', this.oldData],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded KvValueDelta: ${data}`);
        }
        return new KvValueDelta({
            data: data.get('Data'),
            oldData: data.get('OldData'),
        });
    }
}
KvValueDelta.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Data',
        valueSchema: new OptionalSchema(new ByteArraySchema()),
    },
    {
        key: 'OldData',
        valueSchema: new OptionalSchema(new ByteArraySchema()),
    },
]));
/**
 * IncludedTransactions defines the transactions included in a block, their index and last valid round.
 */
export class IncludedTransactions {
    constructor(params) {
        this.lastValid = params.lastValid;
        this.intra = params.intra;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return IncludedTransactions.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['LastValid', this.lastValid],
            ['Intra', this.intra],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded IncludedTransactions: ${data}`);
        }
        return new IncludedTransactions({
            lastValid: data.get('LastValid'),
            intra: Number(data.get('Intra')),
        });
    }
}
IncludedTransactions.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'LastValid',
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'Intra',
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * ModifiedCreatable represents a change to a single creatable state
 */
export class ModifiedCreatable {
    constructor(params) {
        this.creatableType = params.creatableType;
        this.created = params.created;
        this.creator = params.creator;
        this.ndeltas = params.ndeltas;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return ModifiedCreatable.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Ctype', this.creatableType],
            ['Created', this.created],
            ['Creator', this.creator],
            ['Ndeltas', this.ndeltas],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded ModifiedCreatable: ${data}`);
        }
        return new ModifiedCreatable({
            creatableType: Number(data.get('Ctype')),
            created: data.get('Created'),
            creator: data.get('Creator'),
            ndeltas: Number(data.get('Ndeltas')),
        });
    }
}
ModifiedCreatable.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Ctype', // creatableType
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'Created', // created
        valueSchema: new BooleanSchema(),
    },
    {
        key: 'Creator', // creator
        valueSchema: new AddressSchema(),
    },
    {
        key: 'Ndeltas', // ndeltas
        valueSchema: new Uint64Schema(),
    },
]));
/**
 * AlgoCount represents a total of algos of a certain class of accounts (split up by their Status value).
 */
export class AlgoCount {
    constructor(params) {
        this.money = params.money;
        this.rewardUnits = params.rewardUnits;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AlgoCount.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['mon', this.money],
            ['rwd', this.rewardUnits],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AlgoCount: ${data}`);
        }
        return new AlgoCount({
            money: data.get('mon'),
            rewardUnits: data.get('rwd'),
        });
    }
}
AlgoCount.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'mon', valueSchema: new Uint64Schema() }, // money
    { key: 'rwd', valueSchema: new Uint64Schema() }, // rewardUnits
]));
/**
 * AccountTotals represents the totals of algos in the system grouped by different account status values.
 */
export class AccountTotals {
    constructor(params) {
        this.online = params.online;
        this.offline = params.offline;
        this.notParticipating = params.notParticipating;
        this.rewardsLevel = params.rewardsLevel;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return AccountTotals.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['online', this.online.toEncodingData()],
            ['offline', this.offline.toEncodingData()],
            ['notpart', this.notParticipating.toEncodingData()],
            ['rwdlvl', this.rewardsLevel],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded AccountTotals: ${data}`);
        }
        return new AccountTotals({
            online: AlgoCount.fromEncodingData(data.get('online')),
            offline: AlgoCount.fromEncodingData(data.get('offline')),
            notParticipating: AlgoCount.fromEncodingData(data.get('notpart')),
            rewardsLevel: data.get('rwdlvl'),
        });
    }
}
AccountTotals.encodingSchema = new NamedMapSchema(allOmitEmpty([
    { key: 'online', valueSchema: AlgoCount.encodingSchema }, // online
    { key: 'offline', valueSchema: AlgoCount.encodingSchema }, // offline
    { key: 'notpart', valueSchema: AlgoCount.encodingSchema }, // notParticipating
    { key: 'rwdlvl', valueSchema: new Uint64Schema() }, // rewardsLevel
]));
/**
 * LedgerStateDelta describes the delta between a given round to the previous round
 */
export class LedgerStateDelta {
    constructor(params) {
        this.accounts = params.accounts;
        this.kvMods = params.kvMods;
        this.txids = params.txids;
        this.txleases = params.txleases;
        this.creatables = params.creatables;
        this.blockHeader = params.blockHeader;
        this.stateProofNext = params.stateProofNext;
        this.prevTimestamp = params.prevTimestamp;
        this.totals = params.totals;
    }
    // eslint-disable-next-line class-methods-use-this
    getEncodingSchema() {
        return LedgerStateDelta.encodingSchema;
    }
    toEncodingData() {
        return new Map([
            ['Accts', this.accounts.toEncodingData()],
            [
                'KvMods',
                this.kvMods.size === 0
                    ? undefined
                    : convertMap(this.kvMods, (key, value) => [
                        key,
                        value.toEncodingData(),
                    ]),
            ],
            [
                'Txids',
                convertMap(this.txids, (key, value) => [key, value.toEncodingData()]),
            ],
            ['Txleases', this.txleases.toEncodingData()],
            [
                'Creatables',
                this.creatables.size === 0
                    ? undefined
                    : convertMap(this.creatables, (key, value) => [
                        key,
                        value.toEncodingData(),
                    ]),
            ],
            ['Hdr', this.blockHeader.toEncodingData()],
            ['StateProofNext', this.stateProofNext],
            ['PrevTimestamp', this.prevTimestamp],
            ['Totals', this.totals.toEncodingData()],
        ]);
    }
    static fromEncodingData(data) {
        if (!(data instanceof Map)) {
            throw new Error(`Invalid decoded LedgerStateDelta: ${data}`);
        }
        return new LedgerStateDelta({
            accounts: AccountDeltas.fromEncodingData(data.get('Accts')),
            kvMods: convertMap((data.get('KvMods') ?? new Map()), (key, value) => [key, KvValueDelta.fromEncodingData(value)]),
            txids: convertMap(data.get('Txids'), (key, value) => [key, IncludedTransactions.fromEncodingData(value)]),
            txleases: UntypedValue.fromEncodingData(data.get('Txleases')),
            creatables: convertMap((data.get('Creatables') ?? new Map()), (key, value) => [key, ModifiedCreatable.fromEncodingData(value)]),
            blockHeader: BlockHeader.fromEncodingData(data.get('Hdr')),
            stateProofNext: data.get('StateProofNext'),
            prevTimestamp: data.get('PrevTimestamp'),
            totals: AccountTotals.fromEncodingData(data.get('Totals')),
        });
    }
}
LedgerStateDelta.encodingSchema = new NamedMapSchema(allOmitEmpty([
    {
        key: 'Accts', // accounts
        valueSchema: AccountDeltas.encodingSchema,
    },
    {
        key: 'KvMods', // kvMods
        valueSchema: new OptionalSchema(new SpecialCaseBinaryStringMapSchema(KvValueDelta.encodingSchema)),
    },
    {
        key: 'Txids', // txids
        valueSchema: new ByteArrayMapSchema(IncludedTransactions.encodingSchema),
    },
    {
        key: 'Txleases', // txleases
        // Note: because txleases is currently just an UntypedSchema and we are expected to decode
        // null values for this field, we use OptionalSchema to coerce null values to undefined so
        // that the values can be properly omitted during encoding.
        valueSchema: new OptionalSchema(new UntypedSchema()),
    },
    {
        key: 'Creatables', // creatables
        valueSchema: new OptionalSchema(new Uint64MapSchema(ModifiedCreatable.encodingSchema)),
    },
    {
        key: 'Hdr', // blockHeader
        valueSchema: BlockHeader.encodingSchema,
    },
    {
        key: 'StateProofNext', // stateProofNext
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'PrevTimestamp', // prevTimestamp
        valueSchema: new Uint64Schema(),
    },
    {
        key: 'Totals', // totals
        valueSchema: AccountTotals.encodingSchema,
    },
]));
//# sourceMappingURL=statedelta.js.map