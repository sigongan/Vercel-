import { headers } from "next/headers";
import { bearerTokenFrom, resolveSession } from "@/lib/auth/session";

/**
 * "Who is calling?", answered from our own session store.
 *
 * Kept separate from `lib/usage.ts` so the session layer has no dependency on
 * quota or billing — this file only answers identity, and the caller decides
 * what that identity is allowed to do.
 */

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Resolves the `Authorization: Bearer` header against our sessions, or returns
 * null if there isn't a valid one.
 *
 * Null covers every "not signed in" case — no header, a token we don't
 * recognise, one that was revoked, one that expired. Callers treat all of them
 * the same way, and none of them is exceptional on a public API.
 */
export async function getOwnSessionUser(): Promise<CurrentUser | null> {
  const token = bearerTokenFrom((await headers()).get("authorization"));
  if (!token) return null;

  const result = await resolveSession(token);
  if ("rejected" in result) return null;

  return {
    id: result.user.userId,
    email: result.user.email,
    name: result.user.displayName,
  };
}
