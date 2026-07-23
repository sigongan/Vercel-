import Anthropic from "@anthropic-ai/sdk";
import type { Language } from "@/lib/i18n";

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
 * Recipe Scanner: real web search via the Anthropic web_search server tool.
 * The whole search loop runs on Anthropic's side — we send one request and
 * (rarely) resume on pause_turn when the server-side loop pauses itself.
 */
export async function searchRecipes(query: string, lang: Language): Promise<RecipeSearchResult[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system: Anthropic.TextBlockParam[] = [
    // Identical per language — cache it so repeat searches don't re-bill the prompt.
    { type: "text", text: buildSystemPrompt(lang), cache_control: { type: "ephemeral" } },
  ];
  // claude-haiku-4-5 predates the dynamic-filtering web_search_20260209
  // variant — it takes the basic 20250305 tool.
  // The web_search tool's per-search fee is most of this call's cost (far
  // more than the token cost of reading results or writing the answer) —
  // see docs/cost-notes.md. Capping at 2 searches instead of 4 is the
  // single biggest lever available without hurting result quality: one
  // search already returns several candidate recipes, so a second search
  // (a differently-worded query) is usually enough to round out a good
  // 5-7 result list.
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
