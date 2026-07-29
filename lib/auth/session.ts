import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Our own sessions: issuing, checking, and revoking the token the app sends
 * on every request.
 *
 * The token is an opaque random string, not a JWT. Two reasons:
 *
 *  - Revocation is immediate. Signing out or deleting an account kills the
 *    token on the next request, everywhere. A stateless JWT would keep working
 *    until it expired, which is the wrong answer to "delete my account".
 *  - The lookup is free in practice. Every authenticated route already reads
 *    this database for quota or saved recipes, so one indexed probe on the way
 *    in changes nothing measurable.
 *
 * Only the SHA-256 of the token is ever stored. A leak of the sessions table
 * therefore yields nothing usable — the same reason password hashes exist.
 * SHA-256 rather than bcrypt/argon2 is deliberate and correct here: those
 * exist to slow down guessing of low-entropy human passwords, and this value
 * is 256 bits of randomness with nothing to guess.
 */

/** Distinguishes our tokens at a glance in logs, and lets secret scanners match them. */
const TOKEN_PREFIX = "avs1_";

/** 256 bits. Far past anything brute-forceable; the cost of going bigger is zero, so there's no reason to go smaller. */
const TOKEN_BYTES = 32;

/**
 * Sessions last two months and extend on use, so someone who opens the app
 * even occasionally is never logged out. Cooking apps get opened in bursts —
 * a short expiry would mostly punish the user for not cooking for a while.
 */
const SESSION_LIFETIME_DAYS = 60;

/**
 * How stale `last_used_at` must get before a read bothers writing to it. Every
 * authenticated request would otherwise issue a write purely to move a
 * timestamp a few seconds, turning read traffic into write traffic for no gain.
 */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface IssuedSession {
  /**
   * The raw token — the only time it exists in plaintext anywhere. Hand it to
   * the client and drop it; it cannot be recovered from the database.
   */
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export interface SessionUser {
  userId: string;
  sessionId: string;
  email: string | null;
  displayName: string | null;
}

export type SessionRejection = "MISSING" | "MALFORMED" | "UNKNOWN" | "REVOKED" | "EXPIRED";

/** Hex sha256. The single place raw tokens turn into what the database stores. */
function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generateToken(): string {
  // base64url: URL- and header-safe, no padding to strip, denser than hex.
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Issues a session for a user who has *already* been authenticated. This
 * function grants access and asks no questions — every caller must have
 * verified an Apple identity token first.
 */
export async function createSession(
  userId: string,
  options: { clientName?: string } = {}
): Promise<IssuedSession> {
  const supabase = createSupabaseAdminClient();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("auth_sessions")
    .insert({
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: expiresAt.toISOString(),
      client_name: options.clientName ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not create session: ${error?.message ?? "no row returned"}`);
  }

  return { token, sessionId: data.id, expiresAt };
}

/**
 * Resolves a token to the user it belongs to, or explains why it doesn't.
 *
 * Returns a rejection rather than throwing: "not signed in" is an ordinary,
 * expected outcome on a public API, not an exceptional one.
 */
export async function resolveSession(
  token: string | null | undefined
): Promise<{ user: SessionUser } | { rejected: SessionRejection }> {
  if (!token) return { rejected: "MISSING" };
  if (!token.startsWith(TOKEN_PREFIX)) {
    // Cheap shape check before touching the database, so junk and stale
    // Supabase JWTs don't each cost a query.
    return { rejected: "MALFORMED" };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("id, user_id, expires_at, revoked_at, last_used_at, app_users(email, display_name)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) throw new Error(`Could not read session: ${error.message}`);
  if (!data) return { rejected: "UNKNOWN" };

  if (data.revoked_at) return { rejected: "REVOKED" };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { rejected: "EXPIRED" };

  // Supabase types an embedded to-one relation as an array; there is exactly
  // one row behind it because `user_id` is a non-null foreign key.
  const account = Array.isArray(data.app_users) ? data.app_users[0] : data.app_users;

  void touchSession(data.id, data.last_used_at);

  return {
    user: {
      userId: data.user_id,
      sessionId: data.id,
      email: account?.email ?? null,
      displayName: account?.display_name ?? null,
    },
  };
}

/**
 * Slides the expiry forward and records use, at most hourly.
 *
 * Deliberately not awaited by the caller: this is bookkeeping, and a user's
 * request should not fail, or wait, because a timestamp could not be updated.
 */
async function touchSession(sessionId: string, lastUsedAt: string): Promise<void> {
  if (Date.now() - new Date(lastUsedAt).getTime() < TOUCH_INTERVAL_MS) return;

  try {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("auth_sessions")
      .update({
        last_used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", sessionId);
  } catch {
    // Worst case the session expires on its original schedule.
  }
}

/** Signing out on this device. Leaves the user's other sessions alone. */
export async function revokeSession(sessionId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("auth_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);

  if (error) throw new Error(`Could not revoke session: ${error.message}`);
}

/**
 * Signs a user out everywhere. Used for "sign out all devices", and on account
 * deletion so no token outlives the account even for a moment.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("auth_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw new Error(`Could not revoke sessions: ${error.message}`);
}

/** Reads the bearer token out of an Authorization header, if there is one. */
export function bearerTokenFrom(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() || null : null;
}

/**
 * Exported for `scripts/check-session.ts`, which exercises the token format
 * and hashing without a database. Application code has no reason to touch
 * these — a raw hash is not a credential and comparing tokens by hand is how
 * timing leaks get introduced.
 */
export const __testing = {
  hashToken,
  generateToken,
  TOKEN_PREFIX,
  /** Constant-time compare, for tests that assert two tokens differ. */
  tokensEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  },
};
