import { ExtractedContent, ExtractionError } from "./types";

// Vercel serverless functions reject request bodies over ~4.5MB, so larger
// uploads never reach this code anyway — the explicit check exists to give a
// clear message instead of a platform error page.
const MAX_PDF_BYTES = 4 * 1024 * 1024;

/**
 * PDFs are passed to Claude verbatim as a document block — the model reads
 * both the text layer and page images natively, so scanned/photographed PDFs
 * work the same as text PDFs. This replaced pdf-parse, whose bundling broke
 * on Vercel's serverless runtime (locally fine, 500s in production).
 */
export async function extractFromPdf(file: File): Promise<ExtractedContent> {
  if (file.type !== "application/pdf") {
    throw new ExtractionError(`Not a PDF file: ${file.type}`, "INVALID_INPUT");
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new ExtractionError(
      "The PDF is too large (4MB max). Upload just the pages you need, or use a screenshot.",
      "INVALID_INPUT"
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    sourceType: "pdf",
    title: file.name,
    documents: [{ base64: buffer.toString("base64"), mediaType: "application/pdf" }],
  };
}
