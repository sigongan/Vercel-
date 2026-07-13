import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// "Who am I + plan/credits" in one round trip. Clients previously made two
// sequential Supabase calls from the browser (auth.getUser, then a profiles
// select) everywhere this info was needed.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ signedIn: false });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ signedIn: false });
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email, credits, free_used_this_period, plan")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    signedIn: true,
    email: data?.email ?? user.email,
    credits: data?.credits ?? 0,
    free_used_this_period: data?.free_used_this_period ?? 0,
    plan: data?.plan === "pro" ? "pro" : "free",
  });
}
