export function isAppleIapConfigured(): boolean {
  return Boolean(process.env.APPLE_BUNDLE_ID && process.env.APPLE_PRO_PRODUCT_ID);
}

/** The subscription product configured in App Store Connect for Pro. */
export function appleProProductId(): string {
  const id = process.env.APPLE_PRO_PRODUCT_ID;
  if (!id) throw new Error("APPLE_PRO_PRODUCT_ID is not configured.");
  return id;
}

export function appleBundleId(): string {
  const id = process.env.APPLE_BUNDLE_ID;
  if (!id) throw new Error("APPLE_BUNDLE_ID is not configured.");
  return id;
}

/** Only needed once the app is live — Sandbox verification doesn't use it. */
export function appleAppAppleId(): number | undefined {
  const raw = process.env.APPLE_APP_APPLE_ID;
  return raw ? Number(raw) : undefined;
}

/** "Sandbox" while testing (TestFlight, Xcode debug builds, App Review),
 *  "Production" once real customers are buying. Defaults to Sandbox so a
 *  misconfigured deploy fails closed (rejects real-looking receipts) rather
 *  than open. */
export function appleEnvironment(): "Sandbox" | "Production" {
  return process.env.APPLE_IAP_ENVIRONMENT === "Production" ? "Production" : "Sandbox";
}
