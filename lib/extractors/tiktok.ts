import type { Language } from "@/lib/i18n";
import { ExtractedContent, ExtractionError } from "./types";

const CAPTION_ONLY_WARNING: Record<Language, string> = {
  ko: "틱톡은 영상 자체를 분석하지 않고 캡션(설명글) 텍스트만 사용합니다. 캡션에 레시피가 없다면 정확도가 낮을 수 있어요. 더 정확한 결과를 원하면 스크린샷을 업로드해 주세요.",
  en: "TikTok extraction uses only the caption text, not the video itself. If the caption doesn't contain the recipe, accuracy may be low — upload a screenshot for better results.",
};

export async function extractFromTiktok(url: string, lang: Language): Promise<ExtractedContent> {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);

  if (!res.ok) {
    throw new ExtractionError(
      "Could not fetch this TikTok video's details. Check the link or upload a screenshot instead.",
      "EXTRACTION_FAILED"
    );
  }

  const data = await res.json();
  // TikTok's oEmbed "title" field is usually the video caption, which often
  // contains the ingredient list creators type out by hand.
  const text: string | undefined = data.title;

  return {
    sourceType: "tiktok",
    sourceUrl: url,
    title: data.author_name ? `TikTok by ${data.author_name}` : undefined,
    text,
    warning: CAPTION_ONLY_WARNING[lang],
  };
}
