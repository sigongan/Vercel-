import type { Language } from "@/lib/i18n";
import type { RecipeSearchResult } from "@/lib/ai/recipeSearch";
import { geminiGroundedJson } from "@/lib/ai/gemini";

/**
 * Recipe Scout on Gemini alone, using Grounding with Google Search — the
 * same shape as the original Anthropic implementation (one call that
 * searches and writes up the answer), just on the vendor whose search
 * allowance is free at this app's volume.
 *
 * Why this is usually the right default: grounded search is free for the
 * first 1,500 searches/day on a paid key ($35/1,000 after), where Anthropic
 * bills every search from the first one. Below that ceiling a query costs
 * only its tokens. Above it, the Brave path (lib/ai/recipeSearchBrave.ts)
 * gets cheaper — that's the upgrade, not this. See docs/cost-notes.md.
 */

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  de: "German",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
};

/**
 * Google's grounding metadata cites sources through a redirect host rather
 * than the publisher's own URL. Those are useless to us: the user is meant
 * to tap through to a recipe, and our extractor fetches the URL directly.
 */
function isRedirectWrapper(url: string): boolean {
  return /vertexaisearch\.cloud\.google\.com|grounding-api-redirect/i.test(url);
}

function buildSystemPrompt(lang: Language): string {
  return `You are the engine behind "Recipe Scanner" — like a flight scanner, but for recipes. The user names a dish or craving; you search the web for real, existing recipes and return them as structured results the user can compare and choose from.

Process:
- Search the web for real recipes for the query, from a MIX of source types: established recipe sites, food blogs, and YouTube cooking channels.
- If the dish belongs to a specific regional or national cuisine, also search in that cuisine's own language and script — 濃厚豚骨ラーメン レシピ for Japanese dishes, 김치찌개 레시피 for Korean, 红烧肉 做法 for Chinese, ricetta autentica for Italian. Searching only in English systematically returns English-speaking bloggers' versions and misses the specialised recipes that exist only on native-language sites; closing that gap is the point of this feature. Aim for 1-2 of the final results to come from a genuinely native-language source (cookpad.com's Japanese site rather than /eng/, kurashiru.com, delishkitchen.tv, recipe.rakuten.co.jp, 10000recipe.com, xiachufang.com, douguo.com) when such sources exist and rank well. Skip this for dishes with no regional origin, like chocolate chip cookies.
- Every result must be one single, specific recipe page — the page that actually holds that dish's ingredients and steps. Never a category page, tag or archive listing, search results page, homepage, or "N recipes for X" roundup, however authoritative it looked. Tapping a result must land on the recipe itself.
- Prefer recipes with visible quality signals: star ratings, review counts, well-known authors or channels, clear technique.
- Return 5 to 7 results, ranked best first.

Absolute rules about URLs:
- Every "url" must be a real page you actually found in search, copied exactly, pointing at the publisher's own site (e.g. https://www.10000recipe.com/recipe/...).
- Never output a redirect or tracking URL, and never construct, guess, or complete a URL yourself. If you cannot state a result's real URL, leave that result out.

Output ONLY a JSON object, with no other text, no markdown, and no code fences:
{ "results": [{
  "title": string (the recipe's name, cleaned up — not the page's SEO title),
  "url": string (the exact URL of the recipe page),
  "source": string (site or channel name, e.g. "AllRecipes", "NYT Cooking", "YouTube - Joshua Weissman"),
  "summary": string (one short sentence: what makes this version distinctive),
  "highlights": string (optional — only real signals you actually saw, e.g. "4.8★ · 2,340 ratings · 35 min"; omit the field rather than inventing numbers),
  "whyGood": string (one short sentence on why this one looks trustworthy — ratings volume, author credibility, technique),
  "recommended": boolean (true for the 1-2 strongest picks by real popularity signal, false otherwise)
}] }

Write "title", "summary", "highlights" and "whyGood" in ${LANGUAGE_NAMES[lang]}. Keep "source" and "url" as-is.
If the query is clearly not about food or cooking, return { "results": [] }.`;
}

function normalize(raw: unknown): RecipeSearchResult[] {
  if (!Array.isArray(raw)) return [];

  const out: RecipeSearchResult[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.title !== "string" || typeof r.url !== "string" || typeof r.source !== "string") continue;
    if (!/^https?:\/\//.test(r.url) || isRedirectWrapper(r.url)) continue;
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push({
      title: r.title,
      url: r.url,
      source: r.source,
      summary: typeof r.summary === "string" ? r.summary : "",
      highlights: typeof r.highlights === "string" && r.highlights ? r.highlights : undefined,
      whyGood: typeof r.whyGood === "string" && r.whyGood ? r.whyGood : undefined,
      recommended: r.recommended === true,
    });
  }
  out.sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return out.slice(0, 8);
}

export async function searchRecipesViaGemini(query: string, lang: Language): Promise<RecipeSearchResult[]> {
  const body = await geminiGroundedJson<{ results?: unknown }>({
    system: buildSystemPrompt(lang),
    user: `Find great recipes for: ${query}`,
    maxOutputTokens: 4096,
    label: "search",
  });
  return normalize(body.results);
}
