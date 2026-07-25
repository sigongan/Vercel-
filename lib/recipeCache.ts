import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Language } from "@/lib/i18n";
import type { Recipe } from "@/lib/types/recipe";

/**
 * One hash per distinct (source, output language) pair — the same YouTube
 * link or photo requested in Korean vs. English must produce different
 * cached recipes, so `lang` is part of the key.
 */
export function hashSource(kind: string, lang: Language, data: Buffer | string): string {
  const hash = createHash("sha256");
  hash.update(kind);
  hash.update("|");
  hash.update(lang);
  hash.update("|");
  hash.update(data);
  return hash.digest("hex");
}

/** postgrest returns a missing table in the response instead of throwing, so
 *  an un-migrated database is indistinguishable from a cache miss: every
 *  extraction quietly pays full API price with nothing in the logs. Worth
 *  shouting about even though the cache itself stays best-effort. */
function reportCacheError(op: "read" | "write", error: { message?: string; code?: string } | null) {
  if (!error) return;
  const missingTable = error.code === "42P01" || /relation .*recipe_cache.* does not exist/i.test(error.message ?? "");
  if (missingTable) {
    console.error(
      `[recipeCache] ${op} failed: the recipe_cache table does not exist. EVERY extraction is paying full API price. Run supabase/schema.sql in the Supabase SQL editor.`,
    );
  } else {
    console.error(`[recipeCache] ${op} failed`, error);
  }
}

// The cache is an optimization — a Supabase outage or misconfiguration must
// degrade to "no cache", never break extraction itself. Hence the broad
// catches here, unlike the quota path where failing open would be a real bug.
export async function getCachedRecipe(contentHash: string): Promise<Recipe | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("recipe_cache")
      .select("recipe, hit_count")
      .eq("content_hash", contentHash)
      .maybeSingle();

    reportCacheError("read", error);
    if (!data) return null;

    await admin
      .from("recipe_cache")
      .update({ hit_count: data.hit_count + 1 })
      .eq("content_hash", contentHash);

    return data.recipe as Recipe;
  } catch (err) {
    console.error("[recipeCache] read threw", err);
    return null;
  }
}

export async function setCachedRecipe(contentHash: string, recipe: Recipe): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("recipe_cache").upsert({ content_hash: contentHash, recipe });
    reportCacheError("write", error);
  } catch (err) {
    console.error("[recipeCache] write threw", err);
  }
}
