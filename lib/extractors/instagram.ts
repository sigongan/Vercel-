import { ExtractionError } from "./types";
import type { ExtractedContent } from "./types";

/**
 * Instagram retired its open oEmbed endpoint; the official way to read a
 * post's caption now requires a registered Meta app + access token
 * (INSTAGRAM_OEMBED_TOKEN). When that's configured we use it. When it
 * isn't, we fall back to Instagram's public embed page
 * (instagram.com/p/<code>/embed/captioned/), which serves the caption of
 * public posts without auth — unofficial, so it's parsed defensively and
 * any failure drops through to the "upload a screenshot" error rather than
 * breaking extraction outright.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function shortcodeFrom(url: string): string | null {
  const match = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Best-effort caption + author scrape from the public embed page. */
async function fetchViaEmbedPage(url: string): Promise<{ caption?: string; author?: string }> {
  const shortcode = shortcodeFrom(url);
  if (!shortcode) return {};

  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return {};
    const html = await res.text();

    let caption: string | undefined;

    // Markup shape 1: the visible caption block of the embed page.
    const captionDiv = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<\/div>/);
    if (captionDiv) {
      const text = decodeEntities(
        captionDiv[1]
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, " "),
      )
        .replace(/[ \t]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
      if (text) caption = text;
    }

    // Markup shape 2: caption embedded in the page's JSON data.
    if (!caption) {
      const jsonCaption = html.match(/"caption"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (jsonCaption) {
        try {
          const text = JSON.parse(`"${jsonCaption[1]}"`);
          if (typeof text === "string" && text.trim()) caption = text.trim();
        } catch {
          // Malformed escape — treat as not found.
        }
      }
    }

    const author = html.match(/"username"\s*:\s*"([^"]+)"/)?.[1];
    return { caption, author };
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

export async function extractFromInstagram(url: string): Promise<ExtractedContent> {
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
