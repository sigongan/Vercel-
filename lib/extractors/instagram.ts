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
      "인스타그램 링크는 아직 자동으로 불러올 수 없습니다. 게시물 스크린샷이나 영상 파일을 직접 업로드해 주세요.",
      "UNSUPPORTED_SOURCE"
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`
  );

  if (!res.ok) {
    throw new ExtractionError(
      "인스타그램 게시물 정보를 가져오지 못했습니다. 스크린샷을 업로드해 주세요.",
      "EXTRACTION_FAILED"
    );
  }

  const data = await res.json();

  return {
    sourceType: "instagram",
    sourceUrl: url,
    title: data.author_name ? `${data.author_name}의 인스타그램` : undefined,
    text: data.title,
  };
}
