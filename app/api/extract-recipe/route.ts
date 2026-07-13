import { NextRequest, NextResponse } from "next/server";
import { extractFromFile, extractFromUrl, extractFromText, ExtractionError } from "@/lib/extractors";
import type { ExtractedContent } from "@/lib/extractors";
import { parseRecipeFromContent, AiNotConfiguredError, RecipeParseError } from "@/lib/ai/recipeParser";
import type { Language } from "@/lib/i18n";
import type { ExtractRecipeResult } from "@/lib/types/recipe";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser, consumeQuota } from "@/lib/usage";
import { consumeAnonQuota } from "@/lib/anonQuota";
import { consumeAnonIpQuota, getClientIp } from "@/lib/anonIpQuota";
import { isAdminEmail } from "@/lib/admin";
import { ANON_COOKIE_NAME } from "@/lib/billingConstants";
import { hashSource, getCachedRecipe, setCachedRecipe } from "@/lib/recipeCache";

export const runtime = "nodejs";
export const maxDuration = 60;

type ErrorCode =
  | "AI_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "EXTRACTION_FAILED"
  | "UNSUPPORTED_SOURCE"
  | "AUTH_REQUIRED"
  | "QUOTA_EXCEEDED";

type Input =
  | { kind: "file"; file: File; lang: Language }
  | { kind: "url"; url: string; lang: Language }
  | { kind: "text"; text: string; lang: Language };

function asLanguage(value: unknown): Language {
  return value === "ko" ? "ko" : "en";
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // Set only once an anonymous trial use has actually been consumed, so it's
  // persisted on every response from that point on — success or failure —
  // matching how a logged-in user's DB quota is decremented up front too.
  let anonCookieToSet: string | null = null;

  function fail(error: string, code: ErrorCode, status: number) {
    const body: ExtractRecipeResult = { ok: false, error: { error, code } };
    return withAnonCookie(NextResponse.json(body, { status }));
  }

  function withAnonCookie(response: NextResponse) {
    if (anonCookieToSet) {
      response.cookies.set(ANON_COOKIE_NAME, anonCookieToSet, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return response;
  }

  try {
    const input = contentType.includes("multipart/form-data")
      ? await readFileInput(req)
      : await readJsonInput(req);

    const contentHash = await hashInput(input);
    const gated = isSupabaseConfigured();

    if (gated) {
      const cached = await getCachedRecipe(contentHash);
      if (cached) {
        const body: ExtractRecipeResult = { ok: true, recipe: cached };
        return NextResponse.json(body);
      }

      // Auth/quota checks hit Supabase over the network (session lookup, the
      // consume_quota RPC). Login/billing is a value-add, not the core
      // product — if Supabase is misconfigured or unreachable, let the
      // request through rather than 500ing an otherwise-working extraction.
      try {
        const user = await getSessionUser();

        if (user && isAdminEmail(user.email)) {
          // Admin accounts skip quota entirely — no free-limit or credit checks.
        } else if (user) {
          const quota = await consumeQuota(user.id);
          if (!quota.allowed) {
            return fail(
              "이번 달 무료 추출 횟수를 모두 사용했어요. 크레딧을 구매하면 계속 이용하실 수 있어요.",
              "QUOTA_EXCEEDED",
              402
            );
          }
        } else {
          const anon = consumeAnonQuota(req.cookies.get(ANON_COOKIE_NAME)?.value);
          if (!anon.allowed) {
            return fail(
              "무료 체험 횟수를 모두 사용했어요. 로그인하면 매달 5회 무료로 계속 이용하실 수 있어요.",
              "AUTH_REQUIRED",
              401
            );
          }

          // Second, harder-to-bypass gate: a server-side counter keyed by
          // IP hash, so clearing cookies / incognito doesn't reset the trial.
          const ip = getClientIp(req);
          if (ip) {
            try {
              const ipQuota = await consumeAnonIpQuota(ip);
              if (!ipQuota.allowed) {
                return fail(
                  "무료 체험 횟수를 모두 사용했어요. 로그인하면 매달 5회 무료로 계속 이용하실 수 있어요.",
                  "AUTH_REQUIRED",
                  401
                );
              }
            } catch (ipErr) {
              console.error("anon IP quota check failed; allowing through on cookie check alone", ipErr);
            }
          }

          anonCookieToSet = anon.nextCookieValue;
        }
      } catch (gatingErr) {
        console.error("auth/quota check failed; allowing request through ungated", gatingErr);
      }
    }

    const content = await extract(input);
    const recipe = await parseRecipeFromContent(content, input.lang);
    if (content.warning) {
      recipe.notes = recipe.notes ? `${recipe.notes}\n${content.warning}` : content.warning;
    }

    if (gated) {
      await setCachedRecipe(contentHash, recipe);
    }

    const body: ExtractRecipeResult = { ok: true, recipe };
    return withAnonCookie(NextResponse.json(body));
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
    return { kind: "text", text: body.text.trim(), lang };
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
  return hashSource("text", input.lang, input.text);
}

async function extract(input: Input): Promise<ExtractedContent> {
  if (input.kind === "file") return extractFromFile(input.file, input.lang);
  if (input.kind === "url") return extractFromUrl(input.url, input.lang);
  return extractFromText(input.text);
}
