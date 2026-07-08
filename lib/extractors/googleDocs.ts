import { ExtractedContent, ExtractionError } from "./types";

export async function extractFromGoogleDocs(url: string): Promise<ExtractedContent> {
  let docId: string;
  try {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("invalid format");
    }
    docId = match[1];
  } catch {
    throw new ExtractionError("올바른 구글 Docs 링크가 아닙니다.", "INVALID_INPUT");
  }

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  try {
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    if (!text.trim()) {
      throw new ExtractionError("구글 Docs가 비어있거나 접근할 수 없습니다.", "EXTRACTION_FAILED");
    }

    return {
      sourceType: "url",
      sourceUrl: url,
      title: "구글 Docs 레시피",
      text: text.trim(),
    };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(
      "구글 Docs를 불러올 수 없습니다. 공개 또는 링크 공유로 설정되어 있는지 확인해 주세요.",
      "EXTRACTION_FAILED"
    );
  }
}
