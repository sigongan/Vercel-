"use client";

import { isNativeApp, purchasePro } from "@/lib/nativeApp";

// Same value as the server's APPLE_PRO_PRODUCT_ID — has to be public since
// the purchase call originates client-side (StoreKit runs in the webview).
const APPLE_PRO_PRODUCT_ID = process.env.NEXT_PUBLIC_APPLE_PRO_PRODUCT_ID;

export type SubscribeOutcome =
  /** Native purchase completed and Pro is now active — caller should refresh plan state. */
  | "success"
  | "cancelled"
  | "pending"
  | "unavailable"
  | "error";

/**
 * Starts the Pro subscription flow. Apple IAP only — Avocato is iOS-only for
 * monetization, so there's no web checkout path at all. On the website
 * (browser, not the native shell) this always resolves "unavailable";
 * callers show "Get Pro in the iOS app" copy for that case instead of a
 * button that does nothing.
 */
export async function startProSubscription(): Promise<SubscribeOutcome> {
  if (!isNativeApp() || !APPLE_PRO_PRODUCT_ID) return "unavailable";
  return purchasePro(APPLE_PRO_PRODUCT_ID);
}
