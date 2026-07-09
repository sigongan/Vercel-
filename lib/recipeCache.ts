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

// The cache is an optimization — a Supabase outage or misconfiguration must
// degrade to "no cache", never break extraction itself. Hence the broad
// catches here, unlike the quota path where failing open would be a real bug.
export async function getCachedRecipe(contentHash: string): Promise<Recipe | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("recipe_cache")
      .select("recipe, hit_count")
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (!data) return null;

    await admin
      .from("recipe_cache")
      .update({ hit_count: data.hit_count + 1 })
      .eq("content_hash", contentHash);

    return data.recipe as Recipe;
  } catch (err) {
    console.error("recipe cache read failed", err);
    return null;
  }
}

export async function setCachedRecipe(contentHash: string, recipe: Recipe): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createSupabaseAdminClient();
    await admin.from("recipe_cache").upsert({ content_hash: contentHash, recipe });
  } catch (err) {
    console.error("recipe cache write failed", err);
  }
}
