import { ExtractedContent, ExtractionError } from "./types";

const SUPPORTED_MEDIA_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * Frame sampling (ffmpeg) isn't wired up yet, so an uploaded video only
 * carries its filename through to the AI parser today. The route surfaces
 * `warning` to the UI so users know why results may be limited.
 */
export async function extractFromVideoFile(file: File): Promise<ExtractedContent> {
  if (!SUPPORTED_MEDIA_TYPES.includes(file.type)) {
    throw new ExtractionError(`지원하지 않는 동영상 형식입니다: ${file.type}`, "INVALID_INPUT");
  }

  return {
    sourceType: "video-file",
    title: file.name,
    warning: "동영상 프레임 분석은 아직 지원되지 않습니다. 현재는 파일명 정보만 사용됩니다. 더 정확한 결과를 원하면 레시피가 보이는 장면의 스크린샷을 대신 업로드해 주세요.",
  };
}
