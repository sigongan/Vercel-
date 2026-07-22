import type { Language } from "@/lib/i18n";
import { extractFromImage } from "./image";
import { extractFromPdf } from "./pdf";
import { extractFromVideoFile } from "./videoFile";
import { extractFromYoutube } from "./youtube";
import { extractFromTiktok } from "./tiktok";
import { extractFromInstagram } from "./instagram";
import { extractFromGoogleDocs } from "./googleDocs";
import { extractFromWebsite } from "./website";
import { extractFromText } from "./text";
import { ExtractedContent, ExtractionError } from "./types";

export { ExtractionError, extractFromText };
export type { ExtractedContent };

export async function extractFromFile(file: File, lang: Language): Promise<ExtractedContent> {
  if (file.type === "application/pdf") {
    return extractFromPdf(file);
  }
  if (file.type.startsWith("image/")) {
    return extractFromImage(file);
  }
  if (file.type.startsWith("video/")) {
    return extractFromVideoFile(file, lang);
  }

  throw new ExtractionError(`Unsupported file format: ${file.type || "unknown"}`, "INVALID_INPUT");
}

export async function extractFromUrl(rawUrl: string, prefetched?: string): Promise<ExtractedContent> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new ExtractionError("That is not a valid URL.", "INVALID_INPUT");
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
    return extractFromYoutube(url.toString());
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return extractFromTiktok(url.toString());
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return extractFromInstagram(url.toString(), prefetched);
  }
  if (host === "docs.google.com") {
    return extractFromGoogleDocs(url.toString());
  }

  // Anything else: recipe blogs, AllRecipes, newspaper food sections...
  // the generic extractor reads schema.org Recipe JSON-LD when the site
  // has it, or falls back to the page text.
  return extractFromWebsite(url.toString());
}
