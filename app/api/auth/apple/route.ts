import { NextResponse } from "next/server";
import { verifyAppleIdentityToken, AppleTokenError } from "@/lib/auth/appleToken";
import { findOrCreateAccount, type AppleNameHint } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sign in with Apple.
 *
 * The app sends the identity token Apple gave it; we verify it against Apple's
 * public keys, find or create the matching account, and hand back a session
 * token of our own. Apple's token is never stored and never used again after
 * this request — it is proof of identity for one moment, not a credential.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function noStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

interface SignInRequest {
  identityToken?: unknown;
  rawNonce?: unknown;
  fullName?: { givenName?: unknown; familyName?: unknown };
  clientName?: unknown;
}

/**
 * Every verification failure answers the same way. The distinction between
 * "expired", "forged", and "meant for another app" is useful to us in logs but
 * tells an attacker probing the endpoint which part of their forgery to fix.
 */
const REJECTION = { error: "Could not verify that Apple sign-in.", code: "APPLE_AUTH_FAILED" };

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return noStore({ error: "Accounts are not configured on this deployment.", code: "NOT_CONFIGURED" }, { status: 503 });
  }

  let body: SignInRequest;
  try {
    body = await request.json();
  } catch {
    return noStore({ error: "Expected a JSON body.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const identityToken = typeof body.identityToken === "string" ? body.identityToken : null;
  if (!identityToken) {
    return noStore({ error: "identityToken is required.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const rawNonce = typeof body.rawNonce === "string" ? body.rawNonce : undefined;

  let identity;
  try {
    identity = await verifyAppleIdentityToken(identityToken, { expectedRawNonce: rawNonce });
  } catch (error) {
    if (error instanceof AppleTokenError) {
      // Logged with the specific reason so a spike in one kind of failure is
      // visible, while the client only ever sees the generic rejection.
      console.warn(`Apple sign-in rejected: ${error.code}`);
      // A key-fetch failure is our problem, not the caller's — answering 401
      // would tell a legitimate user their account is broken when Apple is
      // simply unreachable.
      const status = error.code === "KEY_FETCH_FAILED" ? 503 : 401;
      return noStore(REJECTION, { status });
    }
    throw error;
  }

  const nameHint = readNameHint(body.fullName);

  try {
    const account = await findOrCreateAccount(identity, nameHint);
    const session = await createSession(account.id, {
      clientName: typeof body.clientName === "string" ? body.clientName.slice(0, 120) : undefined,
    });

    return noStore({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: account.id,
        email: account.email,
        name: account.displayName,
      },
      isNewAccount: account.isNew,
    });
  } catch (error) {
    console.error("Apple sign-in failed after verification", error);
    return noStore({ error: "Could not complete sign-in.", code: "SIGNIN_FAILED" }, { status: 500 });
  }
}

/**
 * Apple hands the user's name to the *client* on first authorization only, and
 * never in the token — so it arrives here as an untrusted hint. It's used for
 * display and nothing else, which is why a wrong or absent value is harmless.
 */
function readNameHint(fullName: SignInRequest["fullName"]): AppleNameHint | undefined {
  if (!fullName || typeof fullName !== "object") return undefined;

  const given = typeof fullName.givenName === "string" ? fullName.givenName.trim().slice(0, 80) : null;
  const family = typeof fullName.familyName === "string" ? fullName.familyName.trim().slice(0, 80) : null;

  if (!given && !family) return undefined;
  return { givenName: given, familyName: family };
}
