"use client";

import { isNativeApp } from "@/lib/nativeApp";
import { instagramShortcodeFrom, parseInstagramEmbedCaption } from "@/lib/instagramCaption";

// A realistic mobile Safari UA — the request genuinely comes from an iPhone.
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

/**
 * On-device caption fetch for social links the server often can't reach.
 * Instagram blocks datacenter IPs (like Vercel's) but happily serves its
 * public embed page to a real phone on a residential/mobile connection —
 * which is exactly where the app is running. CapacitorHttp does the request
 * at the native layer, so the webview's CORS rules don't apply.
 *
 * Returns the caption text, or null when it can't help (not the app, not an
 * Instagram link, private post, network trouble) — callers just pass null
 * through and let the server try its own paths.
 */
export async function prefetchSocialCaption(url: string): Promise<string | null> {
  if (!isNativeApp()) return null;

  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) return null;

  const shortcode = instagramShortcodeFrom(url);
  if (!shortcode) return null;

  try {
    const { CapacitorHttp } = await import("@capacitor/core");
    const res = await CapacitorHttp.get({
      url: `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
      headers: { "User-Agent": IOS_UA, "Accept-Language": "en-US,en;q=0.9" },
      readTimeout: 10000,
      connectTimeout: 10000,
    });
    if (res.status !== 200 || typeof res.data !== "string") return null;
    const { caption } = parseInstagramEmbedCaption(res.data);
    return caption ?? null;
  } catch {
    return null;
  }
}
