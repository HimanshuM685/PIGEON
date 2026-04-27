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
exports.sendAlgo = sendAlgo;
const algosdk = __importStar(require("algosdk"));
const onchain_1 = require("./onchain");
const walletSecret_1 = require("./crypto/walletSecret");
const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const ALGOD_SERVER = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";
function getAlgod() {
    return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}
const MICROALGOS_PER_ALGO = 1_000_000;
/**
 * Send ALGO from the user's account (identified by phone) to a recipient.
 * Requires the user's password to decrypt the mnemonic and sign the transaction.
 */
async function sendAlgo(phone, password, params) {
    console.log("sendAlgo called with phone: ", phone);
    if (!phone?.trim())
        return { success: false, error: "Phone (from) is required" };
    if (!password?.trim())
        return { success: false, error: "Password is required to send (decrypt wallet)" };
    if (!params.to?.trim())
        return { success: false, error: "Recipient (to) is required" };
    const amountAlgo = parseFloat(params.amount);
    if (Number.isNaN(amountAlgo) || amountAlgo <= 0) {
        return { success: false, error: "Invalid amount" };
    }
    const amountMicroAlgos = Math.floor(amountAlgo * MICROALGOS_PER_ALGO);
    let toAddress = params.to.trim();
    // First check if it's a valid Algorand address
    if (algosdk.isValidAddress(toAddress)) {
        // It's a valid address, use it directly
    }
    else {
        // It's not a valid address, treat it as a destination/phone number and search on-chain
        const toUser = await (0, onchain_1.findOnboardedUser)(toAddress);
        if (toUser?.address) {
            toAddress = toUser.address;
        }
        else {
            return {
                success: false,
                error: `Invalid recipient "${params.to}". Use a valid Algorand address or an onboarded phone number.`
            };
        }
    }
    const user = await (0, onchain_1.findOnboardedUser)(phone);
    if (!user?.encrypted_mnemonic || !user?.address) {
        return { success: false, error: "Account not found or not onboarded with password-protected wallet" };
    }
    let sk;
    const isUserAddressAlgorand = algosdk.isValidAddress(user.address);
    if (!isUserAddressAlgorand) {
        return {
            success: false,
            error: "This wallet is Falcon-only and has no Algorand account. Import an Algorand mnemonic to send ALGO.",
        };
    }
    const walletSecret = (() => {
        try {
            return (0, walletSecret_1.decryptWalletSecret)(user.encrypted_mnemonic, password);
        }
        catch {
            return null;
        }
    })();
    if (!walletSecret) {
        return { success: false, error: "Wrong password (decrypt failed)" };
    }
    try {
        const account = algosdk.mnemonicToSecretKey(walletSecret.mnemonic);
        sk = account.sk;
        if (account.addr.toString() !== user.address) {
            return { success: false, error: "Wallet address mismatch" };
        }
    }
    catch {
        return {
            success: false,
            error: "Wallet mnemonic is not a valid Algorand recovery phrase. Re-onboard with an imported Algorand mnemonic.",
        };
    }
    try {
        const algod = getAlgod();
        // Check sender balance before transaction
        const senderInfo = await algod.accountInformation(user.address).do();
        const minBalance = 100000; // 0.1 ALGO minimum balance
        const totalRequired = BigInt(amountMicroAlgos + 1000 + minBalance); // amount + fee + min balance
        if (senderInfo.amount < totalRequired) {
            return {
                success: false,
                error: `Insufficient balance. Required: ${((Number(totalRequired) / 1_000_000).toFixed(6))} ALGO (includes 0.1 ALGO minimum), Available: ${(Number(senderInfo.amount) / 1e6).toFixed(6)} ALGO. Fund your account at: https://bank.testnet.algorand.network/`
            };
        }
        const suggestedParams = await algod.getTransactionParams().do();
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: user.address,
            receiver: toAddress,
            amount: amountMicroAlgos,
            note: new TextEncoder().encode("SMS Wallet Transfer"),
            suggestedParams,
        });
        const signedTxn = txn.signTxn(sk);
        const txId = txn.txID().toString();
        await algod.sendRawTransaction(signedTxn).do();
        // Wait for transaction confirmation
        const confirmedTxn = await algosdk.waitForConfirmation(algod, txId, 10);
        return {
            success: true,
            txId,
            confirmedRound: Number(confirmedTxn.confirmedRound)
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Transaction failed: ${message}` };
    }
}
