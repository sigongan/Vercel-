/**
 * Shared (server + client) parsing for Instagram's public embed page
 * (instagram.com/p/<code>/embed/captioned/), which serves a public post's
 * caption without auth. Pure functions only — the server extractor
 * (lib/extractors/instagram.ts) and the on-device prefetch
 * (lib/socialPrefetch.ts) both parse with these, so the two paths can never
 * drift apart.
 */

export function instagramShortcodeFrom(url: string): string | null {
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

export function parseInstagramEmbedCaption(html: string): { caption?: string; author?: string } {
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
}
