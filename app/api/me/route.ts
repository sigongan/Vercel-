import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// This reflects per-user session state and must never be served from a
// shared cache (browser, Vercel edge, or otherwise) — a signed-out response
// cached and replayed to a now-signed-in visitor is exactly the "I'm signed
// in on one page but not another" bug class.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function noStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

// "Who am I + plan/credits" in one round trip. Clients previously made two
// sequential Supabase calls from the browser (auth.getUser, then a profiles
// select) everywhere this info was needed.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return noStore({ signedIn: false });
  }

  const user = await getSessionUser();
  if (!user) {
    return noStore({ signedIn: false });
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email, credits, free_used_this_period, plan")
    .eq("id", user.id)
    .maybeSingle();

  return noStore({
    signedIn: true,
    email: data?.email ?? user.email,
    credits: data?.credits ?? 0,
    free_used_this_period: data?.free_used_this_period ?? 0,
    plan: data?.plan === "pro" ? "pro" : "free",
  });
}
