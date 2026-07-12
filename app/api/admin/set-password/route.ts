import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * One-time setup endpoint: lets an admin set a password on their own account
 * so they can sign in without waiting on magic-link email. Protected by a
 * shared secret (ADMIN_SETUP_SECRET) since it can set any admin's password —
 * not tied to a logged-in session, since the whole point is to unblock sign-in.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json({ error: "Admin setup is disabled." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.secret !== setupSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Invalid email or password (min 8 chars)." }, { status: 400 });
  }
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "That email isn't in ADMIN_EMAILS." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
