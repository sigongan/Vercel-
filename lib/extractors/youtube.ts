import { YoutubeTranscript } from "youtube-transcript";
import { ExtractedContent, ExtractionError } from "./types";

export async function extractFromYoutube(url: string): Promise<ExtractedContent> {
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

  try {
    const segments = await YoutubeTranscript.fetchTranscript(url);
    const text = segments.map((s) => s.text).join(" ").trim();

    if (!text) {
      throw new Error("empty transcript");
    }

    return { sourceType: "youtube", sourceUrl: url, title, text };
  } catch {
    if (!title) {
      throw new ExtractionError(
        "이 유튜브 영상의 자막과 정보를 가져오지 못했습니다. 링크를 확인해 주세요.",
        "EXTRACTION_FAILED"
      );
    }

    return {
      sourceType: "youtube",
      sourceUrl: url,
      title,
      warning: "이 영상은 자막이 없어 제목 정보만으로 레시피를 추정합니다. 정확도가 낮을 수 있습니다.",
    };
  }
}
