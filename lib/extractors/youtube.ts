import { YoutubeTranscript } from "youtube-transcript";
import type { Language } from "@/lib/i18n";
import { ExtractedContent, ExtractionError } from "./types";

const NO_INFO_WARNING: Record<Language, string> = {
  ko: "이 영상은 자막과 설명란 정보가 부족해 제목만으로 레시피를 추정합니다. 정확도가 낮을 수 있습니다.",
  en: "This video has little caption or description info, so the recipe is inferred from the title alone. Accuracy may be low.",
};

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

// Many cooking channels paste the full written recipe (ingredients with
// exact amounts) into the video description instead of, or in addition to,
// saying it out loud — so captions alone miss it. This is an unofficial
// scrape (no official oembed/API field exposes the description), so any
// failure here is silently ignored and extraction falls back to whatever
// else is available.
async function fetchDescription(url: string): Promise<string | undefined> {
  const videoId = extractVideoId(url);
  if (!videoId) return undefined;

  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return undefined;
    const html = await res.text();

    const match = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (!match) return undefined;

    // The match is a JSON string body — wrap in quotes and JSON.parse to
    // decode \n, \", &, etc. properly instead of hand-rolling it.
    const description = JSON.parse(`"${match[1]}"`);
    return typeof description === "string" ? description.trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function extractFromYoutube(url: string, lang: Language): Promise<ExtractedContent> {
  let title: string | undefined;

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      title = oembed.title;
    }
  } catch {
    // metadata is a nice-to-have; ignore failures
  }

  const description = await fetchDescription(url);

  let transcript: string | undefined;
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url);
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) transcript = text;
  } catch {
    // No captions available — description and title may still be enough.
  }

  const textParts = [
    description ? `Video description:\n${description}` : null,
    transcript ? `Video captions:\n${transcript}` : null,
  ].filter(Boolean);

  if (textParts.length === 0) {
    if (!title) {
      throw new ExtractionError(
        "Could not fetch this YouTube video's captions or details. Please check the link.",
        "EXTRACTION_FAILED"
      );
    }

    return {
      sourceType: "youtube",
      sourceUrl: url,
      title,
      warning: NO_INFO_WARNING[lang],
    };
  }

  return { sourceType: "youtube", sourceUrl: url, title, text: textParts.join("\n\n") };
}
