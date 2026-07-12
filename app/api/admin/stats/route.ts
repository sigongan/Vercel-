import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const [profilesRes, cacheCountRes, savedCountRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, plan, credits, free_used_this_period, subscription_status, created_at")
      .order("created_at", { ascending: false }),
    admin.from("recipe_cache").select("*", { count: "exact", head: true }),
    admin.from("saved_recipes").select("*", { count: "exact", head: true }),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const users = profilesRes.data ?? [];
  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.plan === "pro").length;
  const totalCredits = users.reduce((sum, u) => sum + (u.credits ?? 0), 0);
  const totalFreeUsedThisPeriod = users.reduce((sum, u) => sum + (u.free_used_this_period ?? 0), 0);

  return NextResponse.json({
    summary: {
      totalUsers,
      proUsers,
      totalCredits,
      totalFreeUsedThisPeriod,
      uniqueExtractions: cacheCountRes.count ?? 0,
      savedRecipes: savedCountRes.count ?? 0,
    },
    users,
  });
}
