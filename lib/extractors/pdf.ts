import { ExtractedContent, ExtractionError } from "./types";

export async function extractFromPdf(file: File): Promise<ExtractedContent> {
  if (file.type !== "application/pdf") {
    throw new ExtractionError(`PDF 파일이 아닙니다: ${file.type}`, "INVALID_INPUT");
  }

  // Imported lazily so a pdf-parse load failure only breaks PDF uploads,
  // not every request through this route (it previously took down image
  // and text extraction too, since this module was imported unconditionally
  // at the top of lib/extractors/index.ts).
  let PDFParse: typeof import("pdf-parse").PDFParse;
  try {
    ({ PDFParse } = await import("pdf-parse"));
  } catch (err) {
    console.error("pdf-parse failed to load", err);
    throw new ExtractionError("PDF 처리 기능을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "EXTRACTION_FAILED");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    let result;
    try {
      result = await parser.getText();
    } catch {
      throw new ExtractionError("올바른 PDF 파일이 아니거나 손상되었습니다.", "INVALID_INPUT");
    }

    const text = result.text.trim();

    if (!text) {
      throw new ExtractionError("PDF에서 텍스트를 추출하지 못했습니다.", "EXTRACTION_FAILED");
    }

    return {
      sourceType: "pdf",
      title: file.name,
      text,
    };
  } finally {
    await parser.destroy();
  }
}
