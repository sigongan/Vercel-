import { createHmac, timingSafeEqual } from "crypto";
import { ANON_FREE_LIMIT } from "@/lib/billingConstants";

/**
 * Tracks the anonymous (pre-signup) free trial entirely in a signed cookie —
 * no database row needed. The signature stops a visitor from hand-editing
 * the cookie to reset their count; it does nothing to stop them clearing
 * cookies entirely, which is an accepted, low-stakes bypass for a "try
 * before you sign up" gate rather than a hard usage cap.
 */

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("ANON quota signing requires SUPABASE_SERVICE_ROLE_KEY to be set.");
  }
  return secret;
}

function sign(count: number): string {
  const payload = String(count);
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 16);
  return `${payload}.${sig}`;
}

function verify(cookieValue: string | undefined): number {
  if (!cookieValue) return 0;

  const [payload, sig] = cookieValue.split(".");
  if (!payload || !sig) return 0;

  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 16);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(sig);

  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return 0;
  }

  const count = Number.parseInt(payload, 10);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export type AnonQuotaResult =
  | { allowed: true; nextCookieValue: string; remaining: number }
  | { allowed: false };

/** Reads the current count from the incoming cookie and, if under the limit, returns the next cookie value to set. */
export function consumeAnonQuota(cookieValue: string | undefined): AnonQuotaResult {
  const used = verify(cookieValue);

  if (used >= ANON_FREE_LIMIT) {
    return { allowed: false };
  }

  const next = used + 1;
  return { allowed: true, nextCookieValue: sign(next), remaining: ANON_FREE_LIMIT - next };
}
