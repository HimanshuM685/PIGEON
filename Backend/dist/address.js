"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAddress = getAddress;
const onchain_1 = require("./onchain");
/**
 * Get wallet address for the user's account (identified by phone).
 */
async function getAddress(phone, params = {}) {
    console.log("getAddress called with phone: ", phone);
    if (!phone?.trim())
        return { success: false, error: "Phone is required" };
    const user = await (0, onchain_1.findOnboardedUser)(phone);
    if (!user?.address) {
        return { success: false, error: "Account not found or not onboarded" };
    }
    return {
        success: true,
        address: user.address,
        phone: user.phone,
    };
}
