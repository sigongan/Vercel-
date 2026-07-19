import { NextRequest, NextResponse } from "next/server";
import { extractFromFile, extractFromUrl, extractFromText, ExtractionError } from "@/lib/extractors";
import type { ExtractedContent } from "@/lib/extractors";
import { parseRecipeFromContent, AiNotConfiguredError, RecipeParseError } from "@/lib/ai/recipeParser";
import type { Language } from "@/lib/i18n";
import type { ExtractRecipeResult } from "@/lib/types/recipe";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { consumeTextIpQuota, getClientIp } from "@/lib/anonIpQuota";
import { hashSource, getCachedRecipe, setCachedRecipe } from "@/lib/recipeCache";

export const runtime = "nodejs";
export const maxDuration = 60;

type ErrorCode =
  | "AI_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "EXTRACTION_FAILED"
  | "UNSUPPORTED_SOURCE"
  | "AUTH_REQUIRED"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED";

type Input =
  | { kind: "file"; file: File; lang: Language }
  | { kind: "url"; url: string; lang: Language }
  | { kind: "text"; text: string; lang: Language }
  | { kind: "pantry"; text: string; lang: Language };

function asLanguage(value: unknown): Language {
  return value === "ko" ? "ko" : "en";
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  function fail(error: string, code: ErrorCode, status: number) {
    const body: ExtractRecipeResult = { ok: false, error: { error, code } };
    return NextResponse.json(body, { status });
  }

  try {
    const input = contentType.includes("multipart/form-data")
      ? await readFileInput(req)
      : await readJsonInput(req);

    const contentHash = await hashInput(input);
    const gated = isSupabaseConfigured();

    async function runExtraction() {
      const content = await extract(input);
      const recipe = await parseRecipeFromContent(content, input.lang, parseModeFor(input));
      if (content.warning) {
        recipe.notes = recipe.notes ? `${recipe.notes}\n${content.warning}` : content.warning;
      }

      if (gated) {
        await setCachedRecipe(contentHash, recipe);
      }

      const body: ExtractRecipeResult = { ok: true, recipe };
      return NextResponse.json(body);
    }

    if (gated) {
      const cached = await getCachedRecipe(contentHash);
      if (cached) {
        const body: ExtractRecipeResult = { ok: true, recipe: cached };
        return NextResponse.json(body);
      }

      // Extraction is unmetered for everyone right now — no login wall, no
      // monthly quota — while we figure out what a real limits/pricing
      // design should look like. Text keeps a generous per-IP daily cap as
      // an abuse/cost backstop; file/URL extraction has none yet, so revisit
      // this if usage spikes before a real design is in place.
      if (input.kind === "text" || input.kind === "pantry") {
        const ip = getClientIp(req);
        if (ip) {
          try {
            const cap = await consumeTextIpQuota(ip);
            if (!cap.allowed) {
              return fail(
                "오늘 텍스트 추출 한도에 도달했어요. 텍스트 추출은 무료지만 악용 방지를 위해 하루 한도가 있어요. 내일 다시 이용해 주세요.",
                "RATE_LIMITED",
                429
              );
            }
          } catch (capErr) {
            console.error("text IP cap check failed; allowing through", capErr);
          }
        }
      }
    }

    return await runExtraction();
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

async function readFileInput(req: NextRequest): Promise<Input> {
  const formData = await req.formData();
  const file = formData.get("file");
  const lang = asLanguage(formData.get("lang"));

  if (!(file instanceof File) || file.size === 0) {
    throw new ExtractionError("업로드된 파일이 없습니다.", "INVALID_INPUT");
  }

  return { kind: "file", file, lang };
}

async function readJsonInput(req: NextRequest): Promise<Input> {
  const body = await req.json().catch(() => null);
  const lang = asLanguage(body?.lang);

  if (typeof body?.text === "string" && body.text.trim()) {
    const text = body.text.trim();
    // Text is unmetered, so bound the AI cost of a single request. Real
    // recipes (even blog posts with the recipe buried in them) fit easily.
    if (text.length > 60_000) {
      throw new ExtractionError(
        "That text is too long. Paste just the recipe part.",
        "INVALID_INPUT"
      );
    }
    // Pantry mode: same text pipeline, but the AI invents a dish from the
    // listed ingredients instead of extracting one. A fridge inventory is
    // short — the tighter cap stops essay-length abuse of the cheaper path.
    if (body?.pantry === true) {
      if (text.length > 2_000) {
        throw new ExtractionError(
          "That's a lot of ingredients! List just the main things you have on hand.",
          "INVALID_INPUT"
        );
      }
      return { kind: "pantry", text, lang };
    }
    return { kind: "text", text, lang };
  }

  const url = body?.url;
  if (typeof url !== "string" || !url.trim()) {
    throw new ExtractionError("URL 또는 텍스트를 입력해 주세요.", "INVALID_INPUT");
  }

  return { kind: "url", url: url.trim(), lang };
}

async function hashInput(input: Input): Promise<string> {
  if (input.kind === "file") {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    return hashSource(`file:${input.file.type}`, input.lang, buffer);
  }
  if (input.kind === "url") {
    return hashSource("url", input.lang, input.url);
  }
  return hashSource(input.kind, input.lang, input.text);
}

async function extract(input: Input): Promise<ExtractedContent> {
  if (input.kind === "file") return extractFromFile(input.file, input.lang);
  if (input.kind === "url") return extractFromUrl(input.url, input.lang);
  return extractFromText(input.text);
}

function parseModeFor(input: Input) {
  return input.kind === "pantry" ? ("pantry" as const) : ("extract" as const);
}
