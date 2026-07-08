import type { Language } from "@/lib/i18n";
import { extractFromImage } from "./image";
import { extractFromPdf } from "./pdf";
import { extractFromVideoFile } from "./videoFile";
import { extractFromYoutube } from "./youtube";
import { extractFromTiktok } from "./tiktok";
import { extractFromInstagram } from "./instagram";
import { extractFromGoogleDocs } from "./googleDocs";
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

  throw new ExtractionError(`지원하지 않는 파일 형식입니다: ${file.type || "알 수 없음"}`, "INVALID_INPUT");
}

export async function extractFromUrl(rawUrl: string, lang: Language): Promise<ExtractedContent> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new ExtractionError("올바른 URL이 아닙니다.", "INVALID_INPUT");
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
    return extractFromYoutube(url.toString(), lang);
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return extractFromTiktok(url.toString(), lang);
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return extractFromInstagram(url.toString());
  }
  if (host === "docs.google.com") {
    return extractFromGoogleDocs(url.toString());
  }

  throw new ExtractionError(
    "지원하지 않는 링크입니다. 유튜브, 인스타그램, 틱톡, 구글 Docs 링크를 지원합니다.",
    "UNSUPPORTED_SOURCE"
  );
}
