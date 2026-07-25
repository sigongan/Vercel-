import Anthropic from "@anthropic-ai/sdk";
import type { Language } from "@/lib/i18n";
import { isBraveConfigured } from "@/lib/search/brave";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { searchRecipesViaBrave } from "@/lib/ai/recipeSearchBrave";
import { searchRecipesViaGemini } from "@/lib/ai/recipeSearchGemini";

export class RecipeSearchError extends Error {}

export interface RecipeSearchResult {
  title: string;
  url: string;
  source: string;
  summary: string;
  /** Real quality signals found on the page, e.g. "4.8★ · 2,340 ratings · 35 min". */
  highlights?: string;
  /** One-sentence trust/quality assessment for the user. */
  whyGood?: string;
  /** True for the 1-2 strongest picks by real popularity signal — lets users
   *  decide fast instead of reading every result. */
  recommended?: boolean;
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  de: "German",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
};

function buildSystemPrompt(lang: Language): string {
  return `You are the engine behind "Recipe Scanner" — like a flight scanner, but for recipes. The user names a dish or craving; you find real, existing recipes on the web and return them as structured results the user can compare and choose from.

Process:
- Use web search to find real recipes for the query, from a MIX of source types: established recipe sites, food blogs, and YouTube cooking channels.
- If the dish belongs to a specific regional or national cuisine, you MUST run at least one search using a query written in that cuisine's own native language and script, not just English — e.g. 濃厚豚骨ラーメン レシピ for Japanese dishes, 김치찌개 레시피 for Korean dishes, 红烧肉 做法 for Chinese dishes, ricetta autentica for Italian dishes. This is not optional: English-only search systematically returns English-speaking food bloggers' versions of a dish and misses the specialized, authentic recipes that only exist on native-language sites — that gap is the entire point of this feature. Aim for at least 1-2 of the final results to come from a genuinely native-language/native-domain source (e.g. for Japanese: cookpad.com's Japanese site — not the /eng/ English version, kurashiru.com, delishkitchen.tv, recipe.rakuten.co.jp; for Korean: 10000recipe.com, haemuknamnyeo-style blogs; for Chinese: xiachufang.com, douguo.com) when such sources genuinely exist and rank well, translated into the output language like everything else. Don't force it if the dish has no strong regional origin (e.g. "chocolate chip cookies").
- Every result must link to one single, specific recipe page — the page that actually has that dish's ingredient list and steps. Never return a category page, tag/archive listing, search results page, homepage, or "N recipes for X" roundup, even if it ranked well or looked authoritative — a user tapping the result must land directly on the recipe, not on another list to choose from.
- Prefer recipes with visible quality signals: star ratings, review counts, well-known authors or channels, clear technique.
- Return 5 to 7 results, ranked best first. Every result must be a real page that appeared in your search results — never invent or guess a URL.
- Mark "recommended": true on the 1 or 2 results with the strongest real popularity signal you actually saw (highest review count, most views/likes for a video, or clearly the most widely-cooked/viral version) — these should be the ones a user in a hurry can pick without reading the rest. If nothing has a standout signal, leave every result unrecommended rather than guessing.

Output ONLY a JSON array, with no other text before or after:
[{
  "title": string (the recipe's name, cleaned up — not the page's SEO title),
  "url": string (the exact URL from the search results),
  "source": string (site or channel name, e.g. "AllRecipes", "NYT Cooking", "YouTube - Joshua Weissman"),
  "summary": string (one short sentence: what makes this version distinctive),
  "highlights": string (optional — only real signals you actually saw, e.g. "4.8★ · 2,340 ratings · 35 min"; omit the field entirely rather than inventing numbers),
  "whyGood": string (one short sentence on why this one looks trustworthy or good — ratings volume, author credibility, technique),
  "recommended": boolean (true for the 1-2 strongest picks by real popularity signal, false otherwise)
}]

Write "title", "summary", "highlights", and "whyGood" in ${LANGUAGE_NAMES[lang]}. Keep "source" and "url" as-is.
If the query is clearly not about food or cooking, output exactly [].`;
}

/**
 * Recipe Scanner. Three implementations behind one entry point, picked by
 * which keys are present — cheapest configured option first:
 *
 * 1. GEMINI + BRAVE — Brave does the searching (~$3-5/1,000), Flash-Lite
 *    ranks. The cheapest per query, and the one to move to once Gemini's
 *    free grounding allowance is exhausted.
 * 2. GEMINI alone — Gemini grounds on Google Search itself. Free for the
 *    first 1,500 searches/day, so below that ceiling a query costs only its
 *    tokens. One key, no second vendor: the right default at this volume.
 * 3. Neither — the original Anthropic web_search path, which bills every
 *    search from the first one (~70% of a query's cost).
 *
 * Whichever runs, a failure or an empty result falls through to the next
 * option, so an outage at one vendor degrades to a pricier search rather
 * than a broken feature. Removing a key is the revert if quality
 * disappoints. See docs/cost-notes.md.
 */
export async function searchRecipes(query: string, lang: Language): Promise<RecipeSearchResult[]> {
  if (isGeminiConfigured() && isBraveConfigured()) {
    try {
      const results = await searchRecipesViaBrave(query, lang);
      // Empty is a legitimate answer for a non-food query, but it is also
      // what a quietly-broken pipeline returns, and the second case is the
      // one that would make Recipe Scout look dead. So empty retries on
      // Anthropic: a non-food query pays twice once, then the route caches
      // the empty result and stops paying at all.
      if (results.length > 0) return results;
      console.warn("[recipeSearch] brave/gemini path returned no results; falling through");
    } catch (err) {
      // Loud on purpose: every one of these is a query paying twice.
      console.error("[recipeSearch] brave/gemini path failed; falling through (this costs more)", err);
    }
  }

  if (isGeminiConfigured()) {
    try {
      const results = await searchRecipesViaGemini(query, lang);
      if (results.length > 0) return results;
      console.warn("[recipeSearch] gemini grounded path returned no results; falling back to Anthropic");
    } catch (err) {
      console.error("[recipeSearch] gemini grounded path failed; falling back to Anthropic (this costs more)", err);
    }
  }

  return searchRecipesViaAnthropic(query, lang);
}

/**
 * Recipe Scanner: real web search via the Anthropic web_search server tool.
 * The whole search loop runs on Anthropic's side — we send one request and
 * (rarely) resume on pause_turn when the server-side loop pauses itself.
 */
async function searchRecipesViaAnthropic(query: string, lang: Language): Promise<RecipeSearchResult[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system: Anthropic.TextBlockParam[] = [
    // Identical per language — cache it so repeat searches don't re-bill the prompt.
    { type: "text", text: buildSystemPrompt(lang), cache_control: { type: "ephemeral" } },
  ];
  // claude-haiku-4-5 predates the dynamic-filtering web_search_20260209
  // variant — it takes the basic 20250305 tool.
  // The web_search tool's per-search fee (~$0.01 each) is ~70% of this
  // call's cost — far more than the tokens — so this cap is the main cost
  // dial in the whole app. See docs/cost-notes.md for the measurements.
  //
  // 2, not 3: measured across regional-cuisine queries, dropping the third
  // search still left the model budget for one English + one native-language
  // search, which is what the native-sourcing rule above actually needs.
  // Native results held up on most queries (Cookpad Japan for ramen,
  // 10000recipe for kimchi jjigae) while cutting the queries that used to
  // spend three searches down to two.
  const tools = [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 2 }];
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Find great recipes for: ${query}` },
  ];

  let response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system,
    tools,
    messages,
  });

  // The server-side search loop can stop at its iteration limit — re-send
  // with the assistant turn appended and it resumes where it left off.
  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < 3) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system,
      tools,
      messages,
    });
    continuations++;
  }

  console.log(
    `[recipeSearch] query=${JSON.stringify(query)} input=${response.usage.input_tokens} output=${response.usage.output_tokens} searches=${response.usage.server_tool_use?.web_search_requests ?? 0}`,
  );

  // The final text block carries the JSON (earlier text blocks may narrate
  // the search).
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  const finalText = textBlocks.map((block) => block.text).join("\n");
  const arrayMatch = finalText.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new RecipeSearchError("Search did not return usable results. Try different words.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(arrayMatch[0]);
  } catch {
    throw new RecipeSearchError("Search did not return usable results. Try different words.");
  }
  if (!Array.isArray(parsed)) {
    throw new RecipeSearchError("Search did not return usable results. Try different words.");
  }

  // Keep only well-formed entries with real-looking http(s) URLs.
  const results: RecipeSearchResult[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.title !== "string" || typeof r.url !== "string" || typeof r.source !== "string") continue;
    if (!/^https?:\/\//.test(r.url)) continue;
    results.push({
      title: r.title,
      url: r.url,
      source: r.source,
      summary: typeof r.summary === "string" ? r.summary : "",
      highlights: typeof r.highlights === "string" && r.highlights ? r.highlights : undefined,
      whyGood: typeof r.whyGood === "string" && r.whyGood ? r.whyGood : undefined,
      recommended: r.recommended === true,
    });
  }
  // Recommended picks float to the top so they're the first thing seen.
  results.sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return results.slice(0, 8);
}
