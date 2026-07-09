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

export async function getCachedRecipe(contentHash: string): Promise<Recipe | null> {
  if (!isSupabaseConfigured()) return null;

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
}

export async function setCachedRecipe(contentHash: string, recipe: Recipe): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdminClient();
  await admin.from("recipe_cache").upsert({ content_hash: contentHash, recipe });
}
