import { ExtractionError } from "./types";
import type { ExtractedContent } from "./types";

/**
 * Instagram retired its open oEmbed endpoint; fetching post captions now
 * requires a registered Meta app + access token (INSTAGRAM_OEMBED_TOKEN).
 * Until that's configured we can't pull anything from a bare URL, so we
 * fail fast with a message telling the user to upload a screenshot instead.
 */
export async function extractFromInstagram(url: string): Promise<ExtractedContent> {
  const token = process.env.INSTAGRAM_OEMBED_TOKEN;

  if (!token) {
    throw new ExtractionError(
      "Instagram links can't be fetched automatically yet. Upload a screenshot or video file of the post instead.",
      "UNSUPPORTED_SOURCE"
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`
  );

  if (!res.ok) {
    throw new ExtractionError(
      "Could not fetch this Instagram post's details. Upload a screenshot instead.",
      "EXTRACTION_FAILED"
    );
  }

  const data = await res.json();

  return {
    sourceType: "instagram",
    sourceUrl: url,
    title: data.author_name ? `Instagram by ${data.author_name}` : undefined,
    text: data.title,
  };
}
