"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = getBalance;
const algosdk = __importStar(require("algosdk"));
const onchain_1 = require("./onchain");
const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const ALGOD_SERVER = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";
function getAlgod() {
    return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}
/**
 * Get ALGO balance for the user's account (identified by phone).
 */
async function getBalance(phone, params = {}) {
    console.log("getBalance called with phone: ", phone);
    if (!phone?.trim())
        return { success: false, error: "Phone is required" };
    const user = await (0, onchain_1.findOnboardedUser)(phone);
    if (!user?.address) {
        return { success: false, error: "Account not found or not onboarded" };
    }
    try {
        const algod = getAlgod();
        const accountInfo = await algod.accountInformation(user.address).do();
        const balanceAlgos = Number(accountInfo.amount) / 1_000_000; // Convert from microAlgos to ALGO
        return {
            success: true,
            balance: balanceAlgos.toString(),
            asset: "ALGO",
            address: user.address,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Failed to get balance: ${message}` };
    }
}
