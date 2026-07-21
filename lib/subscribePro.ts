"use client";

import { isNativeApp, purchasePro } from "@/lib/nativeApp";

// Same value as the server's APPLE_PRO_PRODUCT_ID — has to be public since
// the purchase call originates client-side (StoreKit runs in the webview).
const APPLE_PRO_PRODUCT_ID = process.env.NEXT_PUBLIC_APPLE_PRO_PRODUCT_ID;

export type SubscribeOutcome =
  /** Stripe checkout redirect was started — the page is navigating away. */
  | "redirecting"
  /** Native purchase completed and Pro is now active — caller should refresh plan state. */
  | "success"
  | "cancelled"
  | "pending"
  | "unavailable"
  | "unauthorized"
  | "error";

/**
 * Starts the Pro subscription flow for whichever surface the person is on:
 * Apple IAP inside the iOS app (required by App Store review 3.1.1), Stripe
 * Checkout on the website. Callers map the returned outcome to their own
 * translated copy (t.subscribeUnavailable etc.) — this stays UI-text-free
 * so it's shared cleanly between SaveButton and the Library paywall.
 */
export async function startProSubscription(): Promise<SubscribeOutcome> {
  if (isNativeApp()) {
    if (!APPLE_PRO_PRODUCT_ID) return "unavailable";
    const result = await purchasePro(APPLE_PRO_PRODUCT_ID);
    return result;
  }

  try {
    const res = await fetch("/api/stripe/subscribe", { method: "POST" });
    if (res.status === 401) return "unauthorized";
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return "redirecting";
    }
    return "error";
  } catch {
    return "error";
  }
}
