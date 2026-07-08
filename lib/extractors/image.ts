import { ExtractedContent, ExtractionError } from "./types";

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function extractFromImage(file: File): Promise<ExtractedContent> {
  if (!SUPPORTED_MEDIA_TYPES.includes(file.type)) {
    throw new ExtractionError(`지원하지 않는 이미지 형식입니다: ${file.type}`, "INVALID_INPUT");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    sourceType: "image",
    title: file.name,
    images: [{ base64: buffer.toString("base64"), mediaType: file.type }],
  };
}
