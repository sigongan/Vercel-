import type { SourceType } from "@/lib/types/recipe";

export interface ExtractedImage {
  base64: string;
  mediaType: string;
}

export interface ExtractedDocument {
  base64: string;
  mediaType: "application/pdf";
}

export interface ExtractedContent {
  sourceType: SourceType;
  sourceUrl?: string;
  title?: string;
  text?: string;
  images?: ExtractedImage[];
  documents?: ExtractedDocument[];
  warning?: string;
}

export class ExtractionError extends Error {
  code: "INVALID_INPUT" | "EXTRACTION_FAILED" | "UNSUPPORTED_SOURCE";

  constructor(message: string, code: "INVALID_INPUT" | "EXTRACTION_FAILED" | "UNSUPPORTED_SOURCE") {
    super(message);
    this.code = code;
  }
}
