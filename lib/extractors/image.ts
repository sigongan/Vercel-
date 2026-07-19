import { ExtractedContent, ExtractionError } from "./types";

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function extractFromImage(file: File): Promise<ExtractedContent> {
  if (!SUPPORTED_MEDIA_TYPES.includes(file.type)) {
    throw new ExtractionError(`Unsupported image format: ${file.type}`, "INVALID_INPUT");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    sourceType: "image",
    title: file.name,
    images: [{ base64: buffer.toString("base64"), mediaType: file.type }],
  };
}
