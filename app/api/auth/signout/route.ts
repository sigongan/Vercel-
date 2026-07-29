import { NextResponse } from "next/server";
import { bearerTokenFrom, resolveSession, revokeSession, revokeAllSessions } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sign out.
 *
 * Revokes the session behind the presented token — or, with
 * `{"allDevices": true}`, every session the user has. The token stops working
 * on the very next request; that immediacy is the reason sessions are stored
 * rather than being self-contained JWTs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function noStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return noStore({ signedOut: true });
  }

  const token = bearerTokenFrom(request.headers.get("authorization"));
  const result = await resolveSession(token);

  // Signing out without a valid session is not an error. The user's intent is
  // "I should not be signed in", and that is already true — answering 401
  // would leave a client with a dead token stuck unable to clear it.
  if ("rejected" in result) {
    return noStore({ signedOut: true });
  }

  let allDevices = false;
  try {
    const body = await request.json();
    allDevices = body?.allDevices === true;
  } catch {
    // No body is the ordinary case: sign out this device.
  }

  try {
    if (allDevices) await revokeAllSessions(result.user.userId);
    else await revokeSession(result.user.sessionId);
  } catch (error) {
    console.error("Sign-out failed", error);
    return noStore({ error: "Could not sign out.", code: "SIGNOUT_FAILED" }, { status: 500 });
  }

  return noStore({ signedOut: true, allDevices });
}
