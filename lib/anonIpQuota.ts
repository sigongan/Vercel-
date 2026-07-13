import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ANON_FREE_LIMIT } from "@/lib/billingConstants";

/**
 * Second, harder-to-bypass gate on top of the cookie-based anon trial:
 * a server-side counter keyed by a hash of the visitor's IP. Clearing
 * cookies or using incognito no longer resets this one. The raw IP is
 * never stored — only a SHA-256 hash of it.
 */

export function getClientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function consumeAnonIpQuota(ip: string): Promise<{ allowed: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .rpc("consume_anon_ip_quota", { p_ip_hash: hashIp(ip), p_limit: ANON_FREE_LIMIT })
    .single();

  if (error || !data) {
    throw new Error(`consume_anon_ip_quota RPC failed: ${error?.message ?? "no data"}`);
  }

  return { allowed: (data as { allowed: boolean }).allowed };
}
