import type { Language } from "@/lib/i18n";
import type { RecipeSearchResult } from "@/lib/ai/recipeSearch";
import { braveSearch, type BraveResult } from "@/lib/search/brave";
import { geminiJson } from "@/lib/ai/gemini";

/**
 * The cheap Recipe Scout pipeline: plan the queries, search Brave directly,
 * then let a small model rank and write up the hits.
 *
 * Anthropic's web_search tool does all three in one call, but bills ~$0.01
 * per search — ~70% of what a query cost. Splitting the job puts the search
 * on Brave (~$0.003–0.005) and the language work on Flash-Lite (~1/10 of
 * Haiku's token price). See docs/cost-notes.md for the measurements.
 *
 * The trade-off is real and worth naming: the ranking model here only sees
 * titles, URLs and search snippets, never page content. It cannot report a
 * rating it did not see, so `highlights` is sparser than the Anthropic path
 * produced — the prompt below forbids inventing one to fill the gap.
 */

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  de: "German",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
};

interface QueryPlan {
  /** Web-search query in English. */
  english: string;
  /** Same dish in its own cuisine's language/script, when it has one. */
  native?: string;
}

/**
 * Deciding the native-language query is what the Anthropic prompt used to
 * spend a whole extra $0.01 search discovering. Here it's a few hundred
 * Flash-Lite tokens — small enough to round to nothing, and it's what keeps
 * Japanese/Korean/Chinese dishes reaching their own sites.
 */
async function planQueries(query: string): Promise<QueryPlan> {
  const system = `You turn a user's dish request into web-search queries for a recipe finder.

Return JSON: { "english": string, "native": string | null }

- "english": the best English web-search query for finding real recipes for this dish. Add the word "recipe" if it helps. Keep it short.
- "native": if the dish belongs to a specific national or regional cuisine, the same search written in that cuisine's own language and script (e.g. 濃厚豚骨ラーメン レシピ, 김치찌개 레시피, 红烧肉 做法, ricetta carbonara autentica). English-only search systematically misses the specialised recipes that only exist on native-language sites.
- Set "native" to null when the dish has no strong regional origin (e.g. "chocolate chip cookies", "banana bread") or is already in its native language.
- If the request is not about food or cooking at all, set both to null.`;

  const plan = await geminiJson<{ english: string | null; native: string | null }>({
    system,
    user: query,
    maxOutputTokens: 256,
    label: "plan",
  });

  return {
    english: plan.english?.trim() || query,
    native: plan.native?.trim() || undefined,
  };
}

/** Same output contract as the Anthropic path, so the UI is unchanged. */
function buildRankSystemPrompt(lang: Language): string {
  return `You are the engine behind "Recipe Scanner" — like a flight scanner, but for recipes. You are given a user's dish request and a list of real web search results. Pick the best actual recipes among them and return them as structured results the user can compare.

Rules:
- Choose ONLY from the provided search results. Never invent a URL, and never return a URL that is not in the list.
- Every result must be one single, specific recipe page — the page with that dish's ingredients and steps. Reject category pages, tag/archive listings, search result pages, homepages, and "N recipes for X" roundups, however well they rank. Judge from the URL shape and the title/snippet.
- Reject anything that is not a recipe for the requested dish (shopping pages, restaurant listings, news articles).
- Prefer a MIX of source types: established recipe sites, food blogs, and YouTube cooking channels.
- When results from the dish's own native-language sites are present and genuinely good, include 1–2 of them — that is the whole point of this feature. Write them up in the output language like everything else.
- Return 5 to 7 results, ranked best first. If fewer than 5 of the search results are real recipe pages for this dish, return only the ones that are.
- "highlights" may ONLY contain signals actually visible in the snippet you were given (a star rating, a review count, a cook time). You cannot see the page itself, so if the snippet does not state a signal, omit the field entirely. Never invent numbers.
- Mark "recommended": true on the 1 or 2 that look strongest from real signals in the snippets. If nothing stands out, leave every result false rather than guessing.

Return JSON: an object with a "results" array:
{ "results": [{
  "title": string (the recipe's name, cleaned up — not the page's SEO title),
  "url": string (copied exactly from the search results),
  "source": string (site or channel name, e.g. "AllRecipes", "YouTube - Joshua Weissman"),
  "summary": string (one short sentence: what makes this version distinctive),
  "highlights": string (optional — real signals only, else omit),
  "whyGood": string (one short sentence on why this looks trustworthy),
  "recommended": boolean
}] }

Write "title", "summary", "highlights" and "whyGood" in ${LANGUAGE_NAMES[lang]}. Keep "source" and "url" exactly as given.
If none of the search results are recipes for this dish, return { "results": [] }.`;
}

function formatForRanking(results: BraveResult[]): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.description.slice(0, 300)}`)
    .join("\n\n");
}

/** Drops malformed entries and anything whose URL the model didn't get from
 *  the search results — the one hallucination that would actually mislead. */
function normalize(raw: unknown, allowedUrls: Set<string>): RecipeSearchResult[] {
  if (!Array.isArray(raw)) return [];

  const out: RecipeSearchResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.title !== "string" || typeof r.url !== "string" || typeof r.source !== "string") continue;
    if (!/^https?:\/\//.test(r.url)) continue;
    if (!allowedUrls.has(r.url)) continue;
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

export async function searchRecipesViaBrave(query: string, lang: Language): Promise<RecipeSearchResult[]> {
  const plan = await planQueries(query);

  // The native-language search is a second billed Brave request, so it only
  // runs when the planner judged the dish actually has a native cuisine —
  // "chocolate chip cookies" stays a one-search query.
  //
  // Only the English search is allowed to fail the whole pipeline. The
  // native one is an enrichment, and letting it throw would send an
  // otherwise-fine query to the expensive Anthropic fallback over a result
  // set we already had.
  const [english, nativeSettled] = await Promise.all([
    braveSearch(plan.english, 20),
    plan.native
      ? braveSearch(plan.native, 10).catch((err) => {
          console.warn("[recipeSearch:brave] native-language search failed; continuing with English only", err);
          return [] as BraveResult[];
        })
      : Promise.resolve<BraveResult[]>([]),
  ]);
  const native = nativeSettled;

  // Dedupe by URL, keeping the English hit's wording when both found a page.
  const byUrl = new Map<string, BraveResult>();
  for (const r of [...english, ...native]) {
    if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  }
  const candidates = [...byUrl.values()];

  console.log(
    `[recipeSearch:brave] query=${JSON.stringify(query)} braveCalls=${plan.native ? 2 : 1} candidates=${candidates.length}`,
  );

  if (candidates.length === 0) return [];

  const ranked = await geminiJson<{ results?: unknown }>({
    system: buildRankSystemPrompt(lang),
    user: `Dish requested: ${query}\n\nSearch results:\n\n${formatForRanking(candidates)}`,
    maxOutputTokens: 4096,
    label: "rank",
  });

  return normalize(ranked.results, new Set(candidates.map((c) => c.url)));
}
