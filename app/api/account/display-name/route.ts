import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_LENGTH = 60;

/**
 * Lets a user set their own display name.
 *
 * Apple only ever supplies a name on an account's very first authorization —
 * never again, even after a fresh sign-in — and plenty of people decline to
 * share it at all. This is the fallback every account needs regardless of
 * what Apple did or didn't send, not a rarely-used edge case.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = typeof body?.name === "string" ? body.name.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  }
  const name = raw.slice(0, MAX_LENGTH);

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("app_users").update({ display_name: name }).eq("id", user.id);

  if (error) {
    console.error("Failed to update display name", error);
    return NextResponse.json({ error: "Could not save name." }, { status: 500 });
  }

  return NextResponse.json({ name });
}
