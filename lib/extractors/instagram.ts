import { ExtractionError } from "./types";
import type { ExtractedContent } from "./types";
import { instagramShortcodeFrom, parseInstagramEmbedCaption } from "@/lib/instagramCaption";

/**
 * Instagram caption extraction, in preference order:
 *
 * 1. `prefetched` — the caption the iOS app already fetched on-device (see
 *    lib/socialPrefetch.ts). Instagram routinely blocks datacenter IPs like
 *    Vercel's, but a request from the user's own phone looks like any normal
 *    visitor, so this is by far the most reliable path.
 * 2. The official Graph API oEmbed, when INSTAGRAM_OEMBED_TOKEN is set.
 * 3. A server-side fetch of the public embed page — unofficial and often
 *    IP-blocked, but free to try and it's all the website (non-app) flow has.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchViaEmbedPage(url: string): Promise<{ caption?: string; author?: string }> {
  const shortcode = instagramShortcodeFrom(url);
  if (!shortcode) return {};

  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return {};
    return parseInstagramEmbedCaption(await res.text());
  } catch {
    return {};
  }
}

async function fetchViaGraphApi(url: string, token: string): Promise<{ caption?: string; author?: string } | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { caption: data.title, author: data.author_name };
  } catch {
    return null;
  }
}

export async function extractFromInstagram(url: string, prefetched?: string): Promise<ExtractedContent> {
  if (prefetched) {
    return { sourceType: "instagram", sourceUrl: url, text: prefetched };
  }

  const token = process.env.INSTAGRAM_OEMBED_TOKEN;

  let result: { caption?: string; author?: string } = {};
  if (token) {
    result = (await fetchViaGraphApi(url, token)) ?? {};
  }
  if (!result.caption) {
    const scraped = await fetchViaEmbedPage(url);
    if (scraped.caption) result = scraped;
    else if (!result.author && scraped.author) result.author = scraped.author;
  }

  if (!result.caption) {
    throw new ExtractionError(
      "Could not read this Instagram post (it may be private). Upload a screenshot or video file of the post instead.",
      "EXTRACTION_FAILED",
    );
  }

  return {
    sourceType: "instagram",
    sourceUrl: url,
    title: result.author ? `Instagram by ${result.author}` : undefined,
    text: result.caption,
  };
}
