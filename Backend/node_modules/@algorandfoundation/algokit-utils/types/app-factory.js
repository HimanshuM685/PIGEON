'use strict';

var algosdk = require('algosdk');
var types_app = require('./app.js');
var types_appArc56 = require('./app-arc56.js');
var types_appClient = require('./app-client.js');

var SourceMap = algosdk.ProgramSourceMap;
var OnApplicationComplete = algosdk.OnApplicationComplete;
/**
 * ARC-56/ARC-32 app factory that, for a given app spec, allows you to create
 * and deploy one or more app instances and to create one or more app clients
 * to interact with those (or other) app instances.
 */
class AppFactory {
    /**
     * Create a new app factory.
     * @param params The parameters to create the app factory
     * @returns The `AppFactory` instance
     * @example
     * ```typescript
     * const appFactory = new AppFactory({
     *   appSpec: appSpec,
     *   algorand: AlgorandClient.mainNet(),
     * })
     */
    constructor(params) {
        /** Create transactions for the current app */
        this.createTransaction = {
            /** Create bare (raw) transactions for the current app */
            bare: {
                /**
                 * Create a create app call transaction using a bare (raw) create call.
                 *
                 * Performs deploy-time TEAL template placeholder substitutions (if specified).
                 * @param params The parameters to create the create call transaction
                 * @returns The create call transaction
                 */
                create: async (params) => {
                    return this._algorand.createTransaction.appCreate(await this.params.bare.create(params));
                },
            },
            /**
             * Create a create app call transaction using an ABI create call.
             *
             * Performs deploy-time TEAL template placeholder substitutions (if specified).
             * @param params The parameters to create the create call transaction
             * @returns The create call transaction
             */
            create: async (params) => {
                return this._algorand.createTransaction.appCreateMethodCall(await this.params.create(params));
            },
        };
        /** Send transactions to the current app */
        this.send = {
            /** Send bare (raw) transactions for the current app */
            bare: {
                /**
                 * Creates an instance of the app using a bare (raw) create call and returns the result
                 * of the creation transaction and an app client to interact with that app instance.
                 *
                 * Performs deploy-time TEAL template placeholder substitutions (if specified).
                 * @param params The parameters to create the app
                 * @returns The app client and the result of the creation transaction
                 */
                create: async (params) => {
                    const updatable = params?.updatable ?? this._updatable;
                    const deletable = params?.deletable ?? this._deletable;
                    const deployTimeParams = params?.deployTimeParams ?? this._deployTimeParams;
                    const compiled = await this.compile({ deployTimeParams, updatable, deletable });
                    const result = await this.handleCallErrors(async () => ({
                        ...(await this._algorand.send.appCreate(await this.params.bare.create({ ...params, updatable, deletable, deployTimeParams }))),
                        return: undefined,
                    }));
                    return {
                        appClient: this.getAppClientById({
                            appId: result.appId,
                        }),
                        result: {
                            ...result,
                            ...compiled,
                        },
                    };
                },
            },
            /**
             * Creates an instance of the app and returns the result of the creation
             * transaction and an app client to interact with that app instance.
             *
             * Performs deploy-time TEAL template placeholder substitutions (if specified).
             * @param params The parameters to create the app
             * @returns The app client and the result of the creation transaction
             */
            create: async (params) => {
                const updatable = params?.updatable ?? this._updatable;
                const deletable = params?.deletable ?? this._deletable;
                const deployTimeParams = params?.deployTimeParams ?? this._deployTimeParams;
                const compiled = await this.compile({ deployTimeParams, updatable, deletable });
                const result = await this.handleCallErrors(async () => this.parseMethodCallReturn(this._algorand.send.appCreateMethodCall(await this.params.create({ ...params, updatable, deletable, deployTimeParams })), types_appArc56.getArc56Method(params.method, this._appSpec)));
                return {
                    appClient: this.getAppClientById({
                        appId: result.appId,
                    }),
                    result: {
                        ...result,
                        ...compiled,
                    },
                };
            },
        };
        this._appSpec = types_appClient.AppClient.normaliseAppSpec(params.appSpec);
        this._appName = params.appName ?? this._appSpec.name;
        this._algorand = params.algorand;
        this._version = params.version ?? '1.0';
        this._defaultSender = typeof params.defaultSender === 'string' ? algosdk.Address.fromString(params.defaultSender) : params.defaultSender;
        this._defaultSigner = params.defaultSigner;
        this._deployTimeParams = params.deployTimeParams;
        this._updatable = params.updatable;
        this._deletable = params.deletable;
        this._paramsMethods = this.getParamsMethods();
    }
    /** The name of the app (from the ARC-32 / ARC-56 app spec or override). */
    get appName() {
        return this._appName;
    }
    /** The ARC-56 app spec being used */
    get appSpec() {
        return this._appSpec;
    }
    /** Return the algorand client this factory is using. */
    get algorand() {
        return this._algorand;
    }
    /** Get parameters to create transactions (create and deploy related calls) for the current app.
     *
     * A good mental model for this is that these parameters represent a deferred transaction creation.
     * @example Create a transaction in the future using Algorand Client
     * ```typescript
     * const createAppParams = appFactory.params.create({method: 'create_method', args: [123, 'hello']})
     * // ...
     * await algorand.send.AppCreateMethodCall(createAppParams)
     * ```
     * @example Define a nested transaction as an ABI argument
     * ```typescript
     * const createAppParams = appFactory.params.create({method: 'create_method', args: [123, 'hello']})
     * await appClient.send.call({method: 'my_method', args: [createAppParams]})
     * ```
     */
    get params() {
        return this._paramsMethods;
    }
    /**
     * Idempotently deploy (create if not exists, update if changed) an app against the given name for the given creator account, including deploy-time TEAL template placeholder substitutions (if specified).
     *
     * **Note:** When using the return from this function be sure to check `operationPerformed` to get access to various return properties like `transaction`, `confirmation` and `deleteResult`.
     *
     * **Note:** if there is a breaking state schema change to an existing app (and `onSchemaBreak` is set to `'replace'`) the existing app will be deleted and re-created.
     *
     * **Note:** if there is an update (different TEAL code) to an existing app (and `onUpdate` is set to `'replace'`) the existing app will be deleted and re-created.
     * @param params The arguments to control the app deployment
     * @returns The app client and the result of the deployment
     * @example
     * ```ts
     * const { appClient, result } = await factory.deploy({
     *   createParams: {
     *     sender: 'SENDER_ADDRESS',
     *     approvalProgram: 'APPROVAL PROGRAM',
     *     clearStateProgram: 'CLEAR PROGRAM',
     *     schema: {
     *       globalByteSlices: 0,
     *       globalInts: 0,
     *       localByteSlices: 0,
     *       localInts: 0
     *     }
     *   },
     *   updateParams: {
     *     sender: 'SENDER_ADDRESS'
     *   },
     *   deleteParams: {
     *     sender: 'SENDER_ADDRESS'
     *   },
     *   metadata: { name: 'my_app', version: '2.0', updatable: false, deletable: false },
     *   onSchemaBreak: 'append',
     *   onUpdate: 'append'
     *  })
     * ```
     */
    async deploy(params) {
        const updatable = params.updatable ?? this._updatable ?? this.getDeployTimeControl('updatable');
        const deletable = params.deletable ?? this._deletable ?? this.getDeployTimeControl('deletable');
        const deployTimeParams = params.deployTimeParams ?? this._deployTimeParams;
        // Compile using a appID 0 AppClient so we can register the error handler and use the programs
        // to identify the app within the error handler (because we can't use app ID 0)
        const tempAppClient = this.getAppClientById({ appId: 0n });
        const compiled = await tempAppClient.compile({ deployTimeParams, updatable, deletable });
        const deployResult = await this._algorand.appDeployer.deploy({
            ...params,
            createParams: await (params.createParams && 'method' in params.createParams
                ? this.params.create({ ...params.createParams, updatable, deletable, deployTimeParams })
                : this.params.bare.create({ ...params.createParams, updatable, deletable, deployTimeParams })),
            updateParams: params.updateParams && 'method' in params.updateParams
                ? this.params.deployUpdate(params.updateParams)
                : this.params.bare.deployUpdate(params.updateParams),
            deleteParams: params.deleteParams && 'method' in params.deleteParams
                ? this.params.deployDelete(params.deleteParams)
                : this.params.bare.deployDelete(params.deleteParams),
            metadata: {
                name: params.appName ?? this._appName,
                version: this._version,
                updatable,
                deletable,
            },
        });
        const appClient = this.getAppClientById({
            appId: deployResult.appId,
            appName: params.appName,
        });
        const result = {
            ...deployResult,
            ...compiled,
        };
        return {
            appClient,
            result: {
                ...result,
                return: 'return' in result
                    ? result.operationPerformed === 'update'
                        ? params.updateParams && 'method' in params.updateParams
                            ? types_appArc56.getArc56ReturnValue(result.return, types_appArc56.getArc56Method(params.updateParams.method, this._appSpec), this._appSpec.structs)
                            : undefined
                        : params.createParams && 'method' in params.createParams
                            ? types_appArc56.getArc56ReturnValue(result.return, types_appArc56.getArc56Method(params.createParams.method, this._appSpec), this._appSpec.structs)
                            : undefined
                    : undefined,
                deleteReturn: 'deleteReturn' in result && params.deleteParams && 'method' in params.deleteParams
                    ? types_appArc56.getArc56ReturnValue(result.deleteReturn, types_appArc56.getArc56Method(params.deleteParams.method, this._appSpec), this._appSpec.structs)
                    : undefined,
            },
        };
    }
    /**
     * Returns a new `AppClient` client for an app instance of the given ID.
     *
     * Automatically populates appName, defaultSender and source maps from the factory
     * if not specified in the params.
     * @param params The parameters to create the app client
     * @returns The `AppClient` instance
     * @example
     * ```typescript
     * const appClient = factory.getAppClientById({ appId: 12345n })
     * ```
     */
    getAppClientById(params) {
        return new types_appClient.AppClient({
            ...params,
            algorand: this._algorand,
            appSpec: this._appSpec,
            appName: params.appName ?? this._appName,
            defaultSender: params.defaultSender ?? this._defaultSender,
            defaultSigner: params.defaultSigner ?? this._defaultSigner,
            approvalSourceMap: params.approvalSourceMap ?? this._approvalSourceMap,
            clearSourceMap: params.clearSourceMap ?? this._clearSourceMap,
        });
    }
    /**
     * Returns a new `AppClient` client, resolving the app by creator address and name
     * using AlgoKit app deployment semantics (i.e. looking for the app creation transaction note).
     *
     * Automatically populates appName, defaultSender and source maps from the factory
     * if not specified in the params.
     * @param params The parameters to create the app client
     * @returns The `AppClient` instance
     * @example
     * ```typescript
     * const appClient = factory.getAppClientByCreatorAndName({ creatorAddress: 'CREATOR_ADDRESS', appName: 'my_app' })
     * ```
     */
    getAppClientByCreatorAndName(params) {
        return types_appClient.AppClient.fromCreatorAndName({
            ...params,
            algorand: this._algorand,
            appSpec: this._appSpec,
            appName: params.appName ?? this._appName,
            defaultSender: params.defaultSender ?? this._defaultSender,
            approvalSourceMap: params.approvalSourceMap ?? this._approvalSourceMap,
            clearSourceMap: params.clearSourceMap ?? this._clearSourceMap,
        });
    }
    /**
     * Takes an error that may include a logic error from a call to the current app and re-exposes the
     * error to include source code information via the source map and ARC-56 spec.
     * @param e The error to parse
     * @param isClearStateProgram Whether or not the code was running the clear state program (defaults to approval program)
     * @returns The new error, or if there was no logic error or source map then the wrapped error with source details
     */
    exposeLogicError(e, isClearStateProgram) {
        return types_appClient.AppClient.exposeLogicError(e, this._appSpec, {
            isClearStateProgram,
            approvalSourceMap: this._approvalSourceMap,
            clearSourceMap: this._clearSourceMap,
        });
    }
    /**
     * Export the current source maps for the app.
     * @returns The source maps
     */
    exportSourceMaps() {
        if (!this._approvalSourceMap || !this._clearSourceMap) {
            throw new Error("Unable to export source maps; they haven't been loaded into this client - you need to call create, update, or deploy first");
        }
        return {
            approvalSourceMap: this._approvalSourceMap,
            clearSourceMap: this._clearSourceMap,
        };
    }
    /**
     * Import source maps for the app.
     * @param sourceMaps The source maps to import
     */
    importSourceMaps(sourceMaps) {
        this._approvalSourceMap = new SourceMap(sourceMaps.approvalSourceMap);
        this._clearSourceMap = new SourceMap(sourceMaps.clearSourceMap);
    }
    getDeployTimeControl(control) {
        const approval = this._appSpec.source?.approval ? Buffer.from(this._appSpec.source.approval, 'base64').toString('utf-8') : undefined;
        // variable not present, so unknown control value
        if (!approval || !approval.includes(control === 'updatable' ? types_app.UPDATABLE_TEMPLATE_NAME : types_app.DELETABLE_TEMPLATE_NAME))
            return undefined;
        // A call is present and configured
        return (this._appSpec.bareActions.call.includes(control === 'updatable' ? 'UpdateApplication' : 'DeleteApplication') ||
            Object.values(this._appSpec.methods).some((c) => c.actions.call.includes(control === 'updatable' ? 'UpdateApplication' : 'DeleteApplication')));
    }
    getParamsMethods() {
        return {
            /** Return params for a create ABI call, including deploy-time TEAL template replacements and compilation if provided */
            create: async (params) => {
                const compiled = await this.compile({ ...params, deployTimeParams: params.deployTimeParams ?? this._deployTimeParams });
                return this.getABIParams({
                    ...params,
                    deployTimeParams: params.deployTimeParams ?? this._deployTimeParams,
                    schema: params.schema ?? {
                        globalByteSlices: this._appSpec.state.schema.global.bytes,
                        globalInts: this._appSpec.state.schema.global.ints,
                        localByteSlices: this._appSpec.state.schema.local.bytes,
                        localInts: this._appSpec.state.schema.local.ints,
                    },
                    approvalProgram: compiled.approvalProgram,
                    clearStateProgram: compiled.clearStateProgram,
                }, params.onComplete ?? OnApplicationComplete.NoOpOC);
            },
            /** Return params for a deployment update ABI call */
            deployUpdate: (params) => {
                return this.getABIParams(params, OnApplicationComplete.UpdateApplicationOC);
            },
            /** Return params for a deployment delete ABI call */
            deployDelete: (params) => {
                return this.getABIParams(params, OnApplicationComplete.DeleteApplicationOC);
            },
            bare: {
                /** Return params for a create bare call, including deploy-time TEAL template replacements and compilation if provided */
                create: async (params) => {
                    return this.getBareParams({
                        ...params,
                        deployTimeParams: params?.deployTimeParams ?? this._deployTimeParams,
                        schema: params?.schema ?? {
                            globalByteSlices: this._appSpec.state.schema.global.bytes,
                            globalInts: this._appSpec.state.schema.global.ints,
                            localByteSlices: this._appSpec.state.schema.local.bytes,
                            localInts: this._appSpec.state.schema.local.ints,
                        },
                        ...(await this.compile({ ...params, deployTimeParams: params?.deployTimeParams ?? this._deployTimeParams })),
                    }, params?.onComplete ?? OnApplicationComplete.NoOpOC);
                },
                /** Return params for a deployment update bare call */
                deployUpdate: (params) => {
                    return this.getBareParams(params, OnApplicationComplete.UpdateApplicationOC);
                },
                /** Return params for a deployment delete bare call */
                deployDelete: (params) => {
                    return this.getBareParams(params, OnApplicationComplete.DeleteApplicationOC);
                },
            },
        };
    }
    /** Make the given call and catch any errors, augmenting with debugging information before re-throwing. */
    async handleCallErrors(call) {
        try {
            return await call();
        }
        catch (e) {
            throw this.exposeLogicError(e);
        }
    }
    /**
     * Compiles the approval and clear state programs (if TEAL templates provided),
     * performing any provided deploy-time parameter replacement and stores
     * the source maps.
     *
     * If no TEAL templates provided it will use any byte code provided in the app spec.
     *
     * Will store any generated source maps for later use in debugging.
     * @param compilation Optional compilation parameters to use for the compilation
     * @returns The compilation result
     * @example
     * ```typescript
     * const result = await factory.compile()
     * ```
     */
    async compile(compilation) {
        const result = await types_appClient.AppClient.compile(this._appSpec, this._algorand.app, compilation);
        if (result.compiledApproval) {
            this._approvalSourceMap = result.compiledApproval.sourceMap;
        }
        if (result.compiledClear) {
            this._clearSourceMap = result.compiledClear.sourceMap;
        }
        return result;
    }
    getBareParams(params, onComplete) {
        return {
            ...params,
            sender: this.getSender(params?.sender),
            signer: this.getSigner(params?.sender, params?.signer),
            onComplete,
        };
    }
    getABIParams(params, onComplete) {
        return {
            ...params,
            sender: this.getSender(params.sender),
            signer: this.getSigner(params.sender, params.signer),
            method: types_appArc56.getArc56Method(params.method, this._appSpec),
            args: this.getCreateABIArgsWithDefaultValues(params.method, params.args),
            onComplete,
        };
    }
    getCreateABIArgsWithDefaultValues(methodNameOrSignature, args) {
        const m = types_appArc56.getArc56Method(methodNameOrSignature, this._appSpec);
        return args?.map((a, i) => {
            const arg = m.args[i];
            if (a !== undefined) {
                // If a struct then convert to tuple for the underlying call
                return arg.struct && typeof a === 'object' && !Array.isArray(a)
                    ? types_appArc56.getABITupleFromABIStruct(a, this._appSpec.structs[arg.struct], this._appSpec.structs)
                    : a;
            }
            const defaultValue = arg.defaultValue;
            if (defaultValue) {
                switch (defaultValue.source) {
                    case 'literal':
                        return types_appArc56.getABIDecodedValue(Buffer.from(defaultValue.data, 'base64'), m.method.args[i].type, this._appSpec.structs);
                    default:
                        throw new Error(`Can't provide default value for ${defaultValue.source} for a contract creation call`);
                }
            }
            throw new Error(`No value provided for required argument ${arg.name ?? `arg${i + 1}`} in call to method ${m.name}`);
        });
    }
    /** Returns the sender for a call, using the `defaultSender`
     * if none provided and throws an error if neither provided */
    getSender(sender) {
        if (!sender && !this._defaultSender) {
            throw new Error(`No sender provided and no default sender present in app factory for call to app ${this._appName}`);
        }
        return typeof sender === 'string' ? algosdk.Address.fromString(sender) : (sender ?? this._defaultSender);
    }
    /** Returns the signer for a call, using the provided signer or the `defaultSigner`
     * if no signer was provided and the sender resolves to the default sender, the call will use default signer
     * or `undefined` otherwise (so the signer is resolved from `AlgorandClient`) */
    getSigner(sender, signer) {
        return signer ?? (!sender || sender === this._defaultSender ? this._defaultSigner : undefined);
    }
    /**
     * Checks for decode errors on the SendAppTransactionResult and maps the return value to the specified type
     * on the ARC-56 method.
     *
     * If the return type is a struct then the struct will be returned.
     *
     * @param result The SendAppTransactionResult to be mapped
     * @param method The method that was called
     * @returns The smart contract response with an updated return value
     */
    async parseMethodCallReturn(result, method) {
        const resultValue = await result;
        return { ...resultValue, return: types_appArc56.getArc56ReturnValue(resultValue.return, method, this._appSpec.structs) };
    }
}

exports.AppFactory = AppFactory;
//# sourceMappingURL=app-factory.js.map
