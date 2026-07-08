import { ExtractedContent, ExtractionError } from "./types";

const MAX_TEXT_LENGTH = 50_000;

export function extractFromText(raw: string): ExtractedContent {
  const text = raw.trim();

  if (!text) {
    throw new ExtractionError("텍스트를 입력해 주세요.", "INVALID_INPUT");
  }

  return {
    sourceType: "text",
    text: text.slice(0, MAX_TEXT_LENGTH),
  };
}
