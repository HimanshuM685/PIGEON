import { findOnboardedUser } from "./onchain";

export interface AddressParams {
  // No specific params needed for address request
}

export interface AddressResult {
  success: boolean;
  address?: string;
  phone?: string;
  error?: string;
}

/**
 * Get wallet address for the user's account (identified by phone).
 */
export async function getAddress(
  phone: string,
  params: AddressParams = {}
): Promise<AddressResult> {
  console.log("getAddress called with phone: ", phone);
  if (!phone?.trim()) return { success: false, error: "Phone is required" };

  const user = await findOnboardedUser(phone);
  if (!user?.address) {
    return { success: false, error: "Account not found or not onboarded" };
  }

  return {
    success: true,
    address: user.address,
    phone: user.phone,
  };
}
