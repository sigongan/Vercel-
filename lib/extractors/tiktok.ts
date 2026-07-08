import { ExtractedContent, ExtractionError } from "./types";

export async function extractFromTiktok(url: string): Promise<ExtractedContent> {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);

  if (!res.ok) {
    throw new ExtractionError(
      "틱톡 영상 정보를 가져오지 못했습니다. 링크를 확인하거나 스크린샷을 업로드해 주세요.",
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
    title: data.author_name ? `${data.author_name}의 틱톡` : undefined,
    text,
    warning:
      "틱톡은 영상 자체를 분석하지 않고 캡션(설명글) 텍스트만 사용합니다. 캡션에 레시피가 없다면 정확도가 낮을 수 있어요. 더 정확한 결과를 원하면 스크린샷을 업로드해 주세요.",
  };
}
