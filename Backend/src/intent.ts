export type IntentType = "send" | "get_balance" | "get_txn" | "onboard" | "get_address" | "fund" | "get_pvt_key" | "unknown";

export interface IntentParams {
  amount?: string;
  asset?: string;
  to?: string;
  txnId?: string;
  password?: string;
  mnemonic?: string;
}

export interface IntentResult {
  intent: IntentType;
  params: IntentParams;
  rawMessage: string;
}

export async function getIntent(message: string, _apiKey: string): Promise<IntentResult> {
  const { getIntentLocal } = await import('./intentLocal');
  const localResult = getIntentLocal(message);
  if (localResult) {
    console.log('[Intent] Matched locally:', localResult.intent, localResult.params);
    return localResult;
  }

  // No regex match — return unknown (user will see the help menu)
  console.log('[Intent] No local match for:', message);
  return {
    intent: "unknown",
    params: {},
    rawMessage: message,
  };
}
