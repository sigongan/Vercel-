import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ANON_FREE_LIMIT, TEXT_DAILY_IP_LIMIT, PHOTO_DAILY_IP_LIMIT } from "@/lib/billingConstants";

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

/**
 * Daily per-IP cap on free pasted-text extractions — not a paywall, just a
 * backstop so a script can't run up the AI bill on the unlimited-free tier.
 * Resets every day (rows are keyed by ip_hash + date).
 */
export async function consumeTextIpQuota(ip: string): Promise<{ allowed: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .rpc("consume_text_ip_quota", { p_ip_hash: hashIp(ip), p_limit: TEXT_DAILY_IP_LIMIT })
    .single();

  if (error || !data) {
    throw new Error(`consume_text_ip_quota RPC failed: ${error?.message ?? "no data"}`);
  }

  return { allowed: (data as { allowed: boolean }).allowed };
}

/**
 * Same backstop as consumeTextIpQuota, for "What should I eat today?" photo
 * uploads — reuses the identical counter table/RPC but under a distinct
 * hash namespace ("photo:<ip>" vs the bare ip text uses), so a chatty text
 * user and a chatty photo user don't share one bucket and trip each other's
 * cap. No new migration needed.
 */
export async function consumePhotoIpQuota(ip: string): Promise<{ allowed: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .rpc("consume_text_ip_quota", { p_ip_hash: hashIp(`photo:${ip}`), p_limit: PHOTO_DAILY_IP_LIMIT })
    .single();

  if (error || !data) {
    throw new Error(`consume_text_ip_quota RPC failed (photo): ${error?.message ?? "no data"}`);
  }

  return { allowed: (data as { allowed: boolean }).allowed };
}
