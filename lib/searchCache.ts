import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Language } from "@/lib/i18n";
import type { RecipeSearchResult } from "@/lib/ai/recipeSearch";

// Words people pad a dish name with that change nothing about which recipes
// should come back: "best carbonara recipe", "how to make carbonara" and
// "carbonara" all want the same results, and letting each phrasing pay for
// its own web search is the single biggest avoidable cost in this feature.
// Covers the six output languages plus the English phrasings everyone types.
const FILLER_WORDS =
  /\b(?:how to (?:make|cook)|recipe|recipes|rezept|rezepte|ricetta|ricette|receta|recetas|recette|recettes|receita|receitas|best|easy|simple|quick|authentic|homemade|real|good|the|a|an|for|of)\b/g;

// Reused, popular dish names (파스타, 카라게, ...) are the whole point of
// caching here — normalize aggressively so "Carbonara", "carbonara ", and
// "  carbonara" all hit the same cache entry instead of each paying for
// their own web search.
//
// Deliberately does NOT sort the remaining words: "chicken fried steak" and
// "fried chicken steak" are different dishes, and order-insensitive keys
// would serve one when the other was asked for.
function normalizeQuery(query: string): string {
  const stripped = query
    .toLowerCase()
    // Punctuation and emoji, not letters/digits — \p{L} keeps non-Latin
    // scripts intact so 김치찌개 and ラーメン normalize like anything else.
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(FILLER_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  // A query made of nothing but filler ("best recipe") would collapse to an
  // empty key that every such query shares — fall back to the raw text.
  return stripped || query.trim().toLowerCase().replace(/\s+/g, " ");
}

// Bump this whenever lib/ai/recipeSearch.ts's prompt changes in a way that
// could make previously-cached results wrong (e.g. the v1 prompt let
// category/listing pages through as "recommended" results) — folding it
// into the hash makes old entries simply miss instead of serving stale,
// now-incorrect results for up to the full TTL.
const PROMPT_VERSION = "v4";

function hashQuery(query: string, lang: Language): string {
  return createHash("sha256").update(`${PROMPT_VERSION}|${lang}|${normalizeQuery(query)}`).digest("hex");
}

// The web's best carbonara recipes are the same this month as last month, so
// a short TTL bought freshness nobody could perceive while throwing away the
// savings: at 3 days every entry expired before most dishes got searched
// twice. 30 days keeps popular dishes served from cache essentially all the
// time. Prompt changes don't have to wait it out — PROMPT_VERSION above
// invalidates everything the moment results would actually differ.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** postgrest reports a missing table in the response rather than throwing,
 *  so an un-migrated database looks exactly like a cache miss: every search
 *  quietly pays full price and nothing appears in the logs. This is the one
 *  failure here worth shouting about. */
function reportCacheError(op: "read" | "write", error: { message?: string; code?: string } | null) {
  if (!error) return;
  const missingTable = error.code === "42P01" || /relation .*search_cache.* does not exist/i.test(error.message ?? "");
  if (missingTable) {
    console.error(
      `[searchCache] ${op} failed: the search_cache table does not exist. EVERY search is paying full API price. Run supabase/schema_07_search_cache.sql in the Supabase SQL editor.`,
    );
  } else {
    console.error(`[searchCache] ${op} failed`, error);
  }
}

export async function getCachedSearch(query: string, lang: Language): Promise<RecipeSearchResult[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const queryHash = hashQuery(query, lang);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("search_cache")
      .select("results, hit_count, created_at")
      .eq("query_hash", queryHash)
      .maybeSingle();

    reportCacheError("read", error);
    if (!data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > TTL_MS) return null;

    await admin
      .from("search_cache")
      .update({ hit_count: data.hit_count + 1 })
      .eq("query_hash", queryHash);

    return data.results as RecipeSearchResult[];
  } catch (err) {
    console.error("[searchCache] read threw", err);
    return null;
  }
}

export async function setCachedSearch(query: string, lang: Language, results: RecipeSearchResult[]): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const queryHash = hashQuery(query, lang);
    const admin = createSupabaseAdminClient();
    // Reset hit_count and created_at on overwrite so the TTL restarts from
    // this fresh result, same as an upsert would for a brand-new entry.
    const { error } = await admin
      .from("search_cache")
      .upsert({ query_hash: queryHash, results, hit_count: 0, created_at: new Date().toISOString() });
    reportCacheError("write", error);
  } catch (err) {
    console.error("[searchCache] write threw", err);
  }
}
