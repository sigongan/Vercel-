import { NextRequest, NextResponse } from "next/server";
import { searchRecipes, RecipeSearchError } from "@/lib/ai/recipeSearch";
import type { RecipeSearchResult } from "@/lib/ai/recipeSearch";
import type { Language } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { consumeSearchIpQuota, consumeSearchUserQuota, getClientIp } from "@/lib/anonIpQuota";
import { getCachedSearch, setCachedSearch } from "@/lib/searchCache";
import { getSessionUserWithPlan } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_LANGUAGES: readonly Language[] = ["en", "de", "it", "es", "fr", "pt"];

export type RecipeSearchResponse =
  | { ok: true; results: RecipeSearchResult[] }
  | { ok: false; error: string; code: "INVALID_INPUT" | "RATE_LIMITED" | "SEARCH_FAILED" };

function fail(error: string, code: "INVALID_INPUT" | "RATE_LIMITED" | "SEARCH_FAILED", status: number) {
  const body: RecipeSearchResponse = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const lang: Language = VALID_LANGUAGES.includes(body?.lang) ? body.lang : "en";

  if (query.length < 2 || query.length > 100) {
    return fail("Type a dish name to search for.", "INVALID_INPUT", 400);
  }

  // Popular dishes get searched by many different people — reusing a recent
  // result avoids paying for the AI web search again, and skips the daily
  // quota entirely since nothing was actually spent on this request.
  const cached = await getCachedSearch(query, lang);
  if (cached) {
    const response: RecipeSearchResponse = { ok: true, results: cached };
    return NextResponse.json(response);
  }

  // Web search costs real money per query — per-IP daily backstop, same
  // pattern as text/photo extraction. Pro accounts get a higher,
  // account-scoped cap instead (lib/usage.ts, lib/anonIpQuota.ts) so they
  // never share a limit with strangers on the same network.
  if (isSupabaseConfigured()) {
    const sessionUser = await getSessionUserWithPlan().catch(() => null);
    if (sessionUser?.plan === "pro") {
      try {
        const cap = await consumeSearchUserQuota(sessionUser.id);
        if (!cap.allowed) {
          return fail(
            "You've hit today's search limit — it resets tomorrow.",
            "RATE_LIMITED",
            429,
          );
        }
      } catch (err) {
        console.error("pro search quota check failed; allowing through", err);
      }
    } else {
      const ip = getClientIp(req);
      if (ip) {
        try {
          const cap = await consumeSearchIpQuota(ip);
          if (!cap.allowed) {
            return fail(
              "You've hit today's search limit — it resets tomorrow.",
              "RATE_LIMITED",
              429,
            );
          }
        } catch (err) {
          console.error("search IP cap check failed; allowing through", err);
        }
      }
    }
  }

  try {
    const results = await searchRecipes(query, lang);
    await setCachedSearch(query, lang, results);
    const response: RecipeSearchResponse = { ok: true, results };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof RecipeSearchError) {
      return fail(err.message, "SEARCH_FAILED", 502);
    }
    console.error("recipe-search unexpected error", err);
    return fail("Search didn't work. Please try again.", "SEARCH_FAILED", 500);
  }
}
