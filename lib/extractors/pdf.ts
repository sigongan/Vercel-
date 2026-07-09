import { ExtractedContent, ExtractionError } from "./types";

const MAX_SCREENSHOT_PAGES = 3;
// A real recipe's text is always far longer than this; anything shorter is
// treated as scan noise (page numbers, watermarks) rather than real content,
// so we fall back to rendering the pages as images instead.
const MIN_MEANINGFUL_TEXT_LENGTH = 40;

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

    if (text.length >= MIN_MEANINGFUL_TEXT_LENGTH) {
      return {
        sourceType: "pdf",
        title: file.name,
        text,
      };
    }

    // Little to no real text — likely a scanned/photographed PDF (any
    // "text" present is just scan noise like page numbers or a watermark).
    // Render the first few pages as images and let the vision model read
    // them directly, the same way an uploaded screenshot is handled.
    let screenshot;
    try {
      screenshot = await parser.getScreenshot({ first: MAX_SCREENSHOT_PAGES });
    } catch (err) {
      console.error("pdf-parse getScreenshot failed", err);
      throw new ExtractionError("PDF에서 텍스트나 이미지를 추출하지 못했습니다.", "EXTRACTION_FAILED");
    }

    if (screenshot.pages.length === 0) {
      throw new ExtractionError("PDF에서 텍스트를 추출하지 못했습니다.", "EXTRACTION_FAILED");
    }

    return {
      sourceType: "pdf",
      title: file.name,
      images: screenshot.pages.map((page) => ({
        base64: Buffer.from(page.data).toString("base64"),
        mediaType: "image/png",
      })),
      warning:
        screenshot.total > MAX_SCREENSHOT_PAGES
          ? `이 PDF는 텍스트가 없어 앞 ${MAX_SCREENSHOT_PAGES}페이지만 이미지로 분석했습니다 (전체 ${screenshot.total}페이지).`
          : undefined,
    };
  } finally {
    await parser.destroy();
  }
}
