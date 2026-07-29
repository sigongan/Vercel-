import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteAccount } from "@/lib/auth/accounts";
import { revokeAllSessions } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Apple App Store Review Guideline 5.1.1(v): an app that offers account
 * creation must let people delete their account from inside the app, with no
 * email or support-ticket detour.
 *
 * Deletion cascades from `app_users`: profiles, saved recipes, collections,
 * meal plans and sessions all reference it, so removing that one row removes
 * the account and everything tied to it.
 *
 * This used to call Supabase's `auth.admin.deleteUser`. That stopped being
 * correct once identity moved to `app_users` — user data no longer hangs off
 * `auth.users`, and an account created through the Apple flow has no
 * `auth.users` row at all, so the call would fail and leave the account
 * standing while telling the user it was gone.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    // Revoked before the delete so that if anything below fails partway, the
    // user is at least signed out everywhere rather than left holding working
    // tokens for an account they asked us to destroy.
    await revokeAllSessions(user.id);
    await deleteAccount(user.id);
  } catch (error) {
    console.error("account deletion failed", error);
    return NextResponse.json({ error: "Could not delete the account." }, { status: 500 });
  }

  // Legacy cleanup for accounts that still have a Supabase Auth row. Failure
  // is not fatal: the account and its data are already gone, and what remains
  // is an orphaned login record that can no longer reach anything.
  try {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // Expected for accounts created through the Apple flow — they never had one.
  }

  return NextResponse.json({ ok: true });
}
