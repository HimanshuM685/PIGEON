'use strict';

var algosdk = require('algosdk');
var transaction = require('../transaction/transaction.js');
var types_app = require('./app.js');

/** Allows management of application information. */
class AppManager {
    /**
     * Creates an `AppManager`
     * @param algod An algod instance
     */
    constructor(algod) {
        this._compilationResults = {};
        this._algod = algod;
    }
    /**
     * Compiles the given TEAL using algod and returns the result, including source map.
     *
     * The result of this compilation is also cached keyed by the TEAL
     *  code so it can be retrieved via `getCompilationResult`.
     *
     * This function is re-entrant; it will only compile the same code once.
     *
     * @param tealCode The TEAL code
     * @returns The information about the compiled file
     * @example
     * ```typescript
     * const compiled = await appManager.compileTeal(tealProgram)
     * ```
     */
    async compileTeal(tealCode) {
        if (this._compilationResults[tealCode]) {
            return this._compilationResults[tealCode];
        }
        const compiled = await this._algod.compile(tealCode).sourcemap(true).do();
        const result = {
            teal: tealCode,
            compiled: compiled.result,
            compiledHash: compiled.hash,
            compiledBase64ToBytes: new Uint8Array(Buffer.from(compiled.result, 'base64')),
            sourceMap: new algosdk.ProgramSourceMap(JSON.parse(algosdk.encodeJSON(compiled.sourcemap))),
        };
        this._compilationResults[tealCode] = result;
        return result;
    }
    /**
     * Performs template substitution of a teal template and compiles it, returning the compiled result.
     *
     * Looks for `TMPL_{parameter}` for template replacements and replaces AlgoKit deploy-time control parameters
     * if deployment metadata is specified.
     *
     * * `TMPL_UPDATABLE` for updatability / immutability control
     * * `TMPL_DELETABLE` for deletability / permanence control
     *
     * @param tealTemplateCode The TEAL logic to compile
     * @param templateParams Any parameters to replace in the .teal file before compiling
     * @param deploymentMetadata The deployment metadata the app will be deployed with
     * @returns The information about the compiled code
     * @example
     * ```typescript
     * const compiled = await appManager.compileTealTemplate(tealTemplate, { TMPL_APP_ID: 12345n }, { updatable: true, deletable: false })
     * ```
     */
    async compileTealTemplate(tealTemplateCode, templateParams, deploymentMetadata) {
        let tealCode = AppManager.stripTealComments(tealTemplateCode);
        tealCode = AppManager.replaceTealTemplateParams(tealCode, templateParams);
        if (deploymentMetadata) {
            tealCode = AppManager.replaceTealTemplateDeployTimeControlParams(tealCode, deploymentMetadata);
        }
        return await this.compileTeal(tealCode);
    }
    /**
     * Returns a previous compilation result.
     * @param tealCode The TEAL code
     * @returns The information about the previously compiled file
     *  or `undefined` if that TEAL code wasn't previously compiled
     * @example
     * ```typescript
     * const compiled = appManager.getCompilationResult(tealProgram)
     * ```
     */
    getCompilationResult(tealCode) {
        return this._compilationResults[tealCode];
    }
    /**
     * Returns the current app information for the app with the given ID.
     *
     * @example
     * ```typescript
     * const appInfo = await appManager.getById(12353n);
     * ```
     *
     * @param appId The ID of the app
     * @returns The app information
     */
    async getById(appId) {
        const app = await this._algod.getApplicationByID(Number(appId)).do();
        return {
            appId: BigInt(app.id),
            appAddress: algosdk.getApplicationAddress(app.id),
            approvalProgram: app.params.approvalProgram,
            clearStateProgram: app.params.clearStateProgram,
            creator: app.params.creator,
            localInts: Number(app.params.localStateSchema?.numUint ?? 0),
            localByteSlices: Number(app.params.localStateSchema?.numByteSlice ?? 0),
            globalInts: Number(app.params.globalStateSchema?.numUint ?? 0),
            globalByteSlices: Number(app.params.globalStateSchema?.numByteSlice ?? 0),
            extraProgramPages: Number(app.params.extraProgramPages ?? 0),
            globalState: AppManager.decodeAppState(app.params.globalState ?? []),
            version: app.params.version,
        };
    }
    /**
     * Returns the current global state values for the given app ID and account address
     *
     * @param appId The ID of the app to return global state for
     * @returns The current global state for the given app
     * @example
     * ```typescript
     * const globalState = await appManager.getGlobalState(12353n);
     * ```
     */
    async getGlobalState(appId) {
        return (await this.getById(appId)).globalState;
    }
    /**
     * Returns the current local state values for the given app ID and account address
     *
     * @param appId The ID of the app to return local state for
     * @param address The string address of the account to get local state for the given app
     * @returns The current local state for the given (app, account) combination
     * @example
     * ```typescript
     * const localState = await appManager.getLocalState(12353n, 'ACCOUNTADDRESS');
     * ```
     */
    async getLocalState(appId, address) {
        const appInfo = await this._algod.accountApplicationInformation(address, appId).do();
        if (!appInfo.appLocalState?.keyValue) {
            throw new Error("Couldn't find local state");
        }
        return AppManager.decodeAppState(appInfo.appLocalState.keyValue);
    }
    /**
     * Returns the names of the current boxes for the given app.
     * @param appId The ID of the app return box names for
     * @returns The current box names
     * @example
     * ```typescript
     * const boxNames = await appManager.getBoxNames(12353n);
     * ```
     */
    async getBoxNames(appId) {
        const boxResult = await this._algod.getApplicationBoxes(appId).do();
        return boxResult.boxes.map((b) => {
            return {
                nameRaw: b.name,
                nameBase64: Buffer.from(b.name).toString('base64'),
                name: Buffer.from(b.name).toString('utf-8'),
            };
        });
    }
    /**
     * Returns the value of the given box name for the given app.
     * @param appId The ID of the app return box names for
     * @param boxName The name of the box to return either as a string, binary array or `BoxName`
     * @returns The current box value as a byte array
     * @example
     * ```typescript
     * const boxValue = await appManager.getBoxValue(12353n, 'boxName');
     * ```
     */
    async getBoxValue(appId, boxName) {
        const boxId = typeof boxName === 'object' && 'nameRaw' in boxName ? boxName.nameRaw : boxName;
        const name = AppManager.getBoxReference(boxId).name;
        const boxResult = await this._algod.getApplicationBoxByName(Number(appId), name).do();
        return boxResult.value;
    }
    /**
     * Returns the value of the given box names for the given app.
     * @param appId The ID of the app return box names for
     * @param boxNames The names of the boxes to return either as a string, binary array or `BoxName`
     * @returns The current box values as a byte array in the same order as the passed in box names
     * @example
     * ```typescript
     * const boxValues = await appManager.getBoxValues(12353n, ['boxName1', 'boxName2']);
     * ```
     */
    async getBoxValues(appId, boxNames) {
        return await Promise.all(boxNames.map(async (boxName) => await this.getBoxValue(appId, boxName)));
    }
    /**
     * Returns the value of the given box name for the given app decoded based on the given ABI type.
     * @param request The parameters for the box value request
     * @returns The current box value as an ABI value
     * @example
     * ```typescript
     * const boxValue = await appManager.getBoxValueFromABIType({ appId: 12353n, boxName: 'boxName', type: new ABIUintType(32) });
     * ```
     */
    async getBoxValueFromABIType(request) {
        const { appId, boxName, type } = request;
        const value = await this.getBoxValue(appId, boxName);
        return type.decode(value);
    }
    /**
     * Returns the value of the given box names for the given app decoded based on the given ABI type.
     * @param request The parameters for the box value request
     * @returns The current box values as an ABI value in the same order as the passed in box names
     * @example
     * ```typescript
     * const boxValues = await appManager.getBoxValuesFromABIType({ appId: 12353n, boxNames: ['boxName1', 'boxName2'], type: new ABIUintType(32) });
     * ```
     */
    async getBoxValuesFromABIType(request) {
        const { appId, boxNames, type } = request;
        return await Promise.all(boxNames.map(async (boxName) => await this.getBoxValueFromABIType({ appId, boxName, type })));
    }
    /**
     * Returns a `algosdk.BoxReference` given a `BoxIdentifier` or `BoxReference`.
     * @param boxId The box to return a reference for
     * @returns The box reference ready to pass into a `algosdk.Transaction`
     * @example
     * ```typescript
     * const boxRef = AppManager.getBoxReference('boxName');
     * ```
     */
    static getBoxReference(boxId) {
        const ref = typeof boxId === 'object' && 'appId' in boxId ? boxId : { appId: 0n, name: boxId };
        return {
            appIndex: ref.appId,
            name: typeof ref.name === 'string' ? new TextEncoder().encode(ref.name) : 'length' in ref.name ? ref.name : ref.name.addr.publicKey,
        };
    }
    /**
     * Converts an array of global/local state values from the algod api to a more friendly
     * generic object keyed by the UTF-8 value of the key.
     * @param state A `global-state`, `local-state`, `global-state-deltas` or `local-state-deltas`
     * @returns An object keyeed by the UTF-8 representation of the key with various parsings of the values
     * @example
     * ```typescript
     * const stateValues = AppManager.decodeAppState(state);
     * ```
     */
    static decodeAppState(state) {
        const stateValues = {};
        // Start with empty set
        for (const stateVal of state) {
            const keyBase64 = Buffer.from(stateVal.key).toString('base64');
            const keyRaw = stateVal.key;
            const key = Buffer.from(stateVal.key).toString('utf-8');
            const tealValue = stateVal.value;
            const dataTypeFlag = 'action' in tealValue ? tealValue.action : tealValue.type;
            let valueBase64;
            let valueRaw;
            switch (dataTypeFlag) {
                case 1:
                    valueBase64 =
                        typeof tealValue.bytes === 'string' ? tealValue.bytes : tealValue.bytes ? Buffer.from(tealValue.bytes).toString('base64') : '';
                    valueRaw = Buffer.from(valueBase64, 'base64');
                    stateValues[key] = {
                        keyRaw,
                        keyBase64,
                        valueRaw: new Uint8Array(valueRaw),
                        valueBase64: valueBase64,
                        value: valueRaw.toString('utf-8'),
                    };
                    break;
                case 2: {
                    const value = tealValue.uint ?? 0;
                    stateValues[key] = {
                        keyRaw,
                        keyBase64,
                        value: BigInt(value),
                    };
                    break;
                }
                default:
                    throw new Error(`Received unknown state data type of ${dataTypeFlag}`);
            }
        }
        return stateValues;
    }
    /**
     * Returns any ABI return values for the given app call arguments and transaction confirmation.
     * @param confirmation The transaction confirmation from algod
     * @param method The ABI method
     * @returns The return value for the method call
     * @example
     * ```typescript
     * const returnValue = AppManager.getABIReturn(confirmation, ABIMethod.fromSignature('hello(string)void'));
     * ```
     */
    static getABIReturn(confirmation, method) {
        if (!method || !confirmation || method.returns.type === 'void') {
            return undefined;
        }
        // The parseMethodResponse method mutates the second parameter :(
        const resultDummy = {
            txID: '',
            method,
            rawReturnValue: new Uint8Array(),
        };
        return transaction.getABIReturnValue(algosdk.AtomicTransactionComposer.parseMethodResponse(method, resultDummy, confirmation), method.returns.type);
    }
    /**
     * Replaces AlgoKit deploy-time deployment control parameters within the given TEAL template code.
     *
     * * `TMPL_UPDATABLE` for updatability / immutability control
     * * `TMPL_DELETABLE` for deletability / permanence control
     *
     * Note: If these values are defined, but the corresponding `TMPL_*` value
     *  isn't in the teal code it will throw an exception.
     *
     * @param tealTemplateCode The TEAL template code to substitute
     * @param params The deploy-time deployment control parameter value to replace
     * @returns The replaced TEAL code
     * @example
     * ```typescript
     * const tealCode = AppManager.replaceTealTemplateDeployTimeControlParams(tealTemplate, { updatable: true, deletable: false });
     * ```
     */
    static replaceTealTemplateDeployTimeControlParams(tealTemplateCode, params) {
        if (params.updatable !== undefined) {
            if (!tealTemplateCode.includes(types_app.UPDATABLE_TEMPLATE_NAME)) {
                throw new Error(`Deploy-time updatability control requested for app deployment, but ${types_app.UPDATABLE_TEMPLATE_NAME} not present in TEAL code`);
            }
            tealTemplateCode = replaceTemplateVariable(tealTemplateCode, types_app.UPDATABLE_TEMPLATE_NAME, (params.updatable ? 1 : 0).toString());
        }
        if (params.deletable !== undefined) {
            if (!tealTemplateCode.includes(types_app.DELETABLE_TEMPLATE_NAME)) {
                throw new Error(`Deploy-time deletability control requested for app deployment, but ${types_app.DELETABLE_TEMPLATE_NAME} not present in TEAL code`);
            }
            tealTemplateCode = replaceTemplateVariable(tealTemplateCode, types_app.DELETABLE_TEMPLATE_NAME, (params.deletable ? 1 : 0).toString());
        }
        return tealTemplateCode;
    }
    /**
     * Performs template substitution of a teal file.
     *
     * Looks for `TMPL_{parameter}` for template replacements.
     *
     * @param tealTemplateCode The TEAL template code to make parameter replacements in
     * @param templateParams Any parameters to replace in the teal code
     * @returns The TEAL code with replacements
     * @example
     * ```typescript
     * const tealCode = AppManager.replaceTealTemplateParams(tealTemplate, { TMPL_APP_ID: 12345n });
     * ```
     */
    static replaceTealTemplateParams(tealTemplateCode, templateParams) {
        if (templateParams !== undefined) {
            for (const key in templateParams) {
                const value = templateParams[key];
                const token = `TMPL_${key.replace(/^TMPL_/, '')}`;
                // If this is a number, first replace any byte representations of the number
                // These may appear in the TEAL in order to circumvent int compression and preserve PC values
                if (typeof value === 'number' || typeof value === 'bigint') {
                    tealTemplateCode = tealTemplateCode.replace(new RegExp(`(?<=bytes )${token}`, 'g'), `0x${value.toString(16).padStart(16, '0')}`);
                    // We could probably return here since mixing pushint and pushbytes is likely not going to happen, but might as well do both
                }
                tealTemplateCode = replaceTemplateVariable(tealTemplateCode, token, typeof value === 'string'
                    ? `0x${Buffer.from(value, 'utf-8').toString('hex')}`
                    : ArrayBuffer.isView(value)
                        ? `0x${Buffer.from(value).toString('hex')}`
                        : value.toString());
            }
        }
        return tealTemplateCode;
    }
    /**
     * Remove comments from TEAL code (useful to reduce code size before compilation).
     *
     * @param tealCode The TEAL logic to strip
     * @returns The TEAL without comments
     * @example
     * ```typescript
     * const stripped = AppManager.stripTealComments(tealProgram);
     * ```
     */
    static stripTealComments(tealCode) {
        const stripCommentFromLine = (line) => {
            const commentIndex = findUnquotedString(line, '//');
            if (commentIndex === undefined) {
                return line;
            }
            return line.slice(0, commentIndex).trimEnd();
        };
        return tealCode
            .split('\n')
            .map((line) => stripCommentFromLine(line))
            .join('\n');
    }
}
/**
 * Find the first string within a line of TEAL. Only matches outside of quotes and base64 are returned.
 * Returns undefined if not found
 */
const findUnquotedString = (line, token, startIndex = 0, _endIndex) => {
    const endIndex = _endIndex === undefined ? line.length : _endIndex;
    let index = startIndex;
    let inQuotes = false;
    let inBase64 = false;
    while (index < endIndex) {
        const currentChar = line[index];
        if ((currentChar === ' ' || currentChar === '(') && !inQuotes && lastTokenBase64(line, index)) {
            // enter base64
            inBase64 = true;
        }
        else if ((currentChar === ' ' || currentChar === ')') && !inQuotes && inBase64) {
            // exit base64
            inBase64 = false;
        }
        else if (currentChar === '\\' && inQuotes) {
            // escaped char, skip next character
            index += 1;
        }
        else if (currentChar === '"') {
            // quote boundary
            inQuotes = !inQuotes;
        }
        else if (!inQuotes && !inBase64 && line.startsWith(token, index)) {
            // can test for match
            return index;
        }
        index += 1;
    }
    return undefined;
};
const lastTokenBase64 = (line, index) => {
    try {
        const tokens = line.slice(0, index).split(/\s+/);
        const last = tokens[tokens.length - 1];
        return ['base64', 'b64'].includes(last);
    }
    catch {
        return false;
    }
};
function replaceTemplateVariable(program, token, replacement) {
    const result = [];
    const tokenIndexOffset = replacement.length - token.length;
    const programLines = program.split('\n');
    for (const line of programLines) {
        const _commentIndex = findUnquotedString(line, '//');
        const commentIndex = _commentIndex === undefined ? line.length : _commentIndex;
        let code = line.substring(0, commentIndex);
        const comment = line.substring(commentIndex);
        let trailingIndex = 0;
        while (true) {
            const tokenIndex = findTemplateToken(code, token, trailingIndex);
            if (tokenIndex === undefined) {
                break;
            }
            trailingIndex = tokenIndex + token.length;
            const prefix = code.substring(0, tokenIndex);
            const suffix = code.substring(trailingIndex);
            code = `${prefix}${replacement}${suffix}`;
            trailingIndex += tokenIndexOffset;
        }
        result.push(code + comment);
    }
    return result.join('\n');
}
const findTemplateToken = (line, token, startIndex = 0, _endIndex) => {
    const endIndex = line.length ;
    let index = startIndex;
    while (index < endIndex) {
        const tokenIndex = findUnquotedString(line, token, index, endIndex);
        if (tokenIndex === undefined) {
            break;
        }
        const trailingIndex = tokenIndex + token.length;
        if ((tokenIndex === 0 || !isValidTokenCharacter(line[tokenIndex - 1])) &&
            (trailingIndex >= line.length || !isValidTokenCharacter(line[trailingIndex]))) {
            return tokenIndex;
        }
        index = trailingIndex;
    }
    return undefined;
};
function isValidTokenCharacter(char) {
    return char.length === 1 && (/\w/.test(char) || char === '_');
}

exports.AppManager = AppManager;
//# sourceMappingURL=app-manager.js.map
