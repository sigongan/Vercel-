import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";
import { isAdminEmail } from "@/lib/admin";

export { FREE_MONTHLY_LIMIT };

export interface SessionUser {
  id: string;
  email: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  if (isAdminEmail(user.email)) {
    // Admin accounts get every pro perk (save recipes, margin calculator)
    // without ever going through Stripe — keep their plan in sync on every
    // authenticated request rather than requiring a manual DB edit.
    try {
      const admin = createSupabaseAdminClient();
      await admin.from("profiles").update({ plan: "pro" }).eq("id", user.id).neq("plan", "pro");
    } catch (err) {
      console.error("failed to sync admin plan", err);
    }
  }

  return { id: user.id, email: user.email ?? null };
}

export type QuotaResult =
  | { allowed: true; via: "free" | "credit"; freeUsed: number; credits: number }
  | { allowed: false; freeUsed: number; credits: number };

export async function consumeQuota(userId: string): Promise<QuotaResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .rpc("consume_quota", { p_user_id: userId, p_free_limit: FREE_MONTHLY_LIMIT })
    .single();

  if (error || !data) {
    throw new Error(`consume_quota RPC failed: ${error?.message ?? "no data"}`);
  }

  const row = data as { allowed: boolean; via: string; free_used: number; credits: number };

  if (!row.allowed) {
    return { allowed: false, freeUsed: row.free_used, credits: row.credits };
  }

  return {
    allowed: true,
    via: row.via === "credit" ? "credit" : "free",
    freeUsed: row.free_used,
    credits: row.credits,
  };
}
