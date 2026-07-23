import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Language } from "@/lib/i18n";
import type { RecipeSearchResult } from "@/lib/ai/recipeSearch";

// Reused, popular dish names (파스타, 카라게, ...) are the whole point of
// caching here — normalize aggressively so "Carbonara", "carbonara ", and
// "  carbonara" all hit the same cache entry instead of each paying for
// their own web search.
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
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

// Recipes on the web don't change day to day, but links can go stale or a
// better match can appear — a short TTL keeps results fresh without losing
// most of the cost savings (repeat searches for the same dish cluster
// heavily in short windows, e.g. everyone searching "라자냐" this evening).
const TTL_MS = 3 * 24 * 60 * 60 * 1000;

export async function getCachedSearch(query: string, lang: Language): Promise<RecipeSearchResult[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const queryHash = hashQuery(query, lang);
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("search_cache")
      .select("results, hit_count, created_at")
      .eq("query_hash", queryHash)
      .maybeSingle();

    if (!data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > TTL_MS) return null;

    await admin
      .from("search_cache")
      .update({ hit_count: data.hit_count + 1 })
      .eq("query_hash", queryHash);

    return data.results as RecipeSearchResult[];
  } catch (err) {
    console.error("search cache read failed", err);
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
    await admin
      .from("search_cache")
      .upsert({ query_hash: queryHash, results, hit_count: 0, created_at: new Date().toISOString() });
  } catch (err) {
    console.error("search cache write failed", err);
  }
}
