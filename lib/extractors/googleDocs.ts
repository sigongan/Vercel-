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
    throw new ExtractionError("That is not a valid Google Docs link.", "INVALID_INPUT");
  }

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  try {
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    if (!text.trim()) {
      throw new ExtractionError("The Google Doc is empty or inaccessible.", "EXTRACTION_FAILED");
    }

    return {
      sourceType: "url",
      sourceUrl: url,
      title: "Google Docs recipe",
      text: text.trim(),
    };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(
      "Could not load the Google Doc. Make sure it is shared publicly or via link.",
      "EXTRACTION_FAILED"
    );
  }
}
