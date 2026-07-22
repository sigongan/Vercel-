import { ExtractedContent, ExtractionError } from "./types";

export async function extractFromTiktok(url: string): Promise<ExtractedContent> {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);

  if (!res.ok) {
    throw new ExtractionError(
      "Could not fetch this TikTok video's details. Check the link or upload a screenshot instead.",
      "EXTRACTION_FAILED"
    );
  }

  const data = await res.json();
  // TikTok's oEmbed "title" field is usually the video caption, which often
  // contains the ingredient list creators type out by hand. When it doesn't,
  // the AI reconstructs the recipe from the dish name and says so in notes —
  // no extractor-level warning needed.
  const text: string | undefined = data.title;

  return {
    sourceType: "tiktok",
    sourceUrl: url,
    title: data.author_name ? `TikTok by ${data.author_name}` : undefined,
    text,
  };
}
