import { NextRequest, NextResponse } from "next/server";
import { extractFromFile, extractFromUrl, extractFromText, ExtractionError } from "@/lib/extractors";
import type { ExtractedContent } from "@/lib/extractors";
import { parseRecipeFromContent, AiNotConfiguredError, RecipeParseError } from "@/lib/ai/recipeParser";
import type { Language } from "@/lib/i18n";
import type { ExtractRecipeResult } from "@/lib/types/recipe";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(
  error: string,
  code: "AI_NOT_CONFIGURED" | "INVALID_INPUT" | "EXTRACTION_FAILED" | "UNSUPPORTED_SOURCE",
  status: number
) {
  const body: ExtractRecipeResult = { ok: false, error: { error, code } };
  return NextResponse.json(body, { status });
}

function asLanguage(value: unknown): Language {
  return value === "ko" ? "ko" : "en";
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  try {
    const { content, lang } = contentType.includes("multipart/form-data")
      ? await handleFileUpload(req)
      : await handleJsonInput(req);

    const recipe = await parseRecipeFromContent(content, lang);
    if (content.warning) {
      recipe.notes = recipe.notes ? `${recipe.notes}\n${content.warning}` : content.warning;
    }
    const body: ExtractRecipeResult = { ok: true, recipe };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof ExtractionError) {
      return fail(err.message, err.code, 422);
    }
    if (err instanceof AiNotConfiguredError) {
      return fail(
        "AI가 아직 연결되지 않았습니다. 서버에 ANTHROPIC_API_KEY를 설정하면 레시피 추출이 활성화됩니다.",
        "AI_NOT_CONFIGURED",
        503
      );
    }
    if (err instanceof RecipeParseError) {
      return fail(err.message, "EXTRACTION_FAILED", 502);
    }

    console.error("extract-recipe unexpected error", err);
    return fail("알 수 없는 오류가 발생했습니다.", "EXTRACTION_FAILED", 500);
  }
}

async function handleFileUpload(req: NextRequest): Promise<{ content: ExtractedContent; lang: Language }> {
  const formData = await req.formData();
  const file = formData.get("file");
  const lang = asLanguage(formData.get("lang"));

  if (!(file instanceof File) || file.size === 0) {
    throw new ExtractionError("업로드된 파일이 없습니다.", "INVALID_INPUT");
  }

  return { content: await extractFromFile(file, lang), lang };
}

async function handleJsonInput(req: NextRequest): Promise<{ content: ExtractedContent; lang: Language }> {
  const body = await req.json().catch(() => null);
  const lang = asLanguage(body?.lang);

  if (typeof body?.text === "string" && body.text.trim()) {
    return { content: extractFromText(body.text), lang };
  }

  const url = body?.url;
  if (typeof url !== "string" || !url.trim()) {
    throw new ExtractionError("URL 또는 텍스트를 입력해 주세요.", "INVALID_INPUT");
  }

  return { content: await extractFromUrl(url.trim(), lang), lang };
}
