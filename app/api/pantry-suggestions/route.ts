import { NextRequest, NextResponse } from "next/server";
import { extractFromImage } from "@/lib/extractors/image";
import { ExtractionError } from "@/lib/extractors/types";
import {
  parsePantrySuggestions,
  AiNotConfiguredError,
  RecipeParseError,
  type PantryPreferences,
} from "@/lib/ai/recipeParser";
import type { Language } from "@/lib/i18n";
import type { Recipe } from "@/lib/types/recipe";
import { consumeTextIpQuota, consumePhotoIpQuota, getClientIp } from "@/lib/anonIpQuota";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 60;

type ErrorCode = "AI_NOT_CONFIGURED" | "INVALID_INPUT" | "EXTRACTION_FAILED" | "RATE_LIMITED";

export type PantrySuggestionsResult =
  | { ok: true; recipes: Recipe[] }
  | { ok: false; error: { error: string; code: ErrorCode } };

const VALID_LANGUAGES: readonly Language[] = ["en", "de", "it", "es", "fr", "pt"];

function asLanguage(value: unknown): Language {
  return VALID_LANGUAGES.includes(value as Language) ? (value as Language) : "en";
}

const VALID_CUISINES = ["korean", "italian", "mexican", "chinese", "american"];
const VALID_METHODS = ["roast", "fry", "grill", "soup", "bake"];

function asPreferences(cuisine: unknown, method: unknown): PantryPreferences {
  return {
    cuisine: typeof cuisine === "string" && VALID_CUISINES.includes(cuisine) ? cuisine : undefined,
    method: typeof method === "string" && VALID_METHODS.includes(method) ? method : undefined,
  };
}

function asCount(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 3;
  return [1, 2, 3].includes(n) ? n : 3;
}

export async function POST(req: NextRequest) {
  function fail(error: string, code: ErrorCode, status: number) {
    const body: PantrySuggestionsResult = { ok: false, error: { error, code } };
    return NextResponse.json(body, { status });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image");
      const lang = asLanguage(formData.get("lang"));
      const preferences = asPreferences(formData.get("cuisine"), formData.get("method"));
      const count = asCount(formData.get("count"));
      if (!(file instanceof File) || file.size === 0) {
        return fail("No photo was uploaded.", "INVALID_INPUT", 400);
      }

      if (isSupabaseConfigured()) {
        const ip = getClientIp(req);
        if (ip) {
          try {
            const cap = await consumePhotoIpQuota(ip);
            if (!cap.allowed) {
              return fail(
                "오늘 사진으로 받을 수 있는 추천 횟수를 모두 사용했어요. 악용 방지를 위해 하루 한도가 있어요 — 내일 다시 이용하거나, 재료를 텍스트로 입력해 주세요.",
                "RATE_LIMITED",
                429,
              );
            }
          } catch (capErr) {
            console.error("photo IP cap check failed; allowing through", capErr);
          }
        }
      }

      const content = await extractFromImage(file);
      const recipes = await parsePantrySuggestions(content, lang, preferences, count);
      return NextResponse.json({ ok: true, recipes } satisfies PantrySuggestionsResult);
    }

    const body = await req.json().catch(() => null);
    const lang = asLanguage(body?.lang);
    const preferences = asPreferences(body?.cuisine, body?.method);
    const count = asCount(body?.count);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return fail("List a few ingredients you have on hand.", "INVALID_INPUT", 400);
    }
    // Short input expected (an ingredient list, not an essay) — same bound
    // as the Extract tab's Fridge mode.
    if (text.length > 2_000) {
      return fail("That's a lot of ingredients! List just the main things you have.", "INVALID_INPUT", 400);
    }

    if (isSupabaseConfigured()) {
      const ip = getClientIp(req);
      if (ip) {
        try {
          const cap = await consumeTextIpQuota(ip);
          if (!cap.allowed) {
            return fail(
              "오늘 텍스트 추출 한도에 도달했어요. 텍스트 추출은 무료지만 악용 방지를 위해 하루 한도가 있어요. 내일 다시 이용해 주세요.",
              "RATE_LIMITED",
              429,
            );
          }
        } catch (capErr) {
          console.error("text IP cap check failed; allowing through", capErr);
        }
      }
    }

    const recipes = await parsePantrySuggestions({ sourceType: "text", text }, lang, preferences, count);
    return NextResponse.json({ ok: true, recipes } satisfies PantrySuggestionsResult);
  } catch (err) {
    if (err instanceof ExtractionError) {
      return fail(err.message, err.code === "UNSUPPORTED_SOURCE" ? "INVALID_INPUT" : err.code, 422);
    }
    if (err instanceof AiNotConfiguredError) {
      return fail(
        "AI가 아직 연결되지 않았습니다. 서버에 ANTHROPIC_API_KEY를 설정하면 레시피 추출이 활성화됩니다.",
        "AI_NOT_CONFIGURED",
        503,
      );
    }
    if (err instanceof RecipeParseError) {
      return fail(err.message, "EXTRACTION_FAILED", 502);
    }
    console.error("pantry-suggestions unexpected error", err);
    return fail("알 수 없는 오류가 발생했습니다.", "EXTRACTION_FAILED", 500);
  }
}
