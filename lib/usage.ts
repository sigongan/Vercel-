import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUser } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";
import { isAdminEmail } from "@/lib/admin";

export { FREE_MONTHLY_LIMIT };

export interface SessionUser {
  id: string;
  email: string | null;
  /** Only set for Google/Apple sign-in (from the provider's profile) — null
   *  for email-magic-link users, who have no name on file. */
  name: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Cookies for the web app, `Authorization: Bearer` for the native app —
  // resolved in one place so every route handler supports both without
  // knowing which client it's talking to.
  const user = await getSupabaseUser();

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

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
  };
}

export interface SessionUserWithPlan extends SessionUser {
  plan: "pro" | "free";
}

/** Same as getSessionUser, plus the profile's plan — used by the
 *  extraction/search rate limiters to give Pro accounts a higher,
 *  account-scoped ceiling instead of the shared per-IP daily cap (which a
 *  Pro user could otherwise still hit on a busy shared network). */
export async function getSessionUserWithPlan(): Promise<SessionUserWithPlan | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  return { ...user, plan: data?.plan === "pro" ? "pro" : "free" };
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
