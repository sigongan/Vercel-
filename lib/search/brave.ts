/**
 * Brave Web Search — the cheap half of the Recipe Scout pipeline.
 *
 * Anthropic's built-in web_search tool bills ~$0.01 per search and was ~70%
 * of what a Recipe Scout query cost. Brave bills roughly $3–5 per 1,000
 * (~$0.003–0.005), so doing the searching here and using an LLM only to rank
 * and summarise the hits is where the savings come from. See
 * docs/cost-notes.md.
 */

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const TIMEOUT_MS = 8_000;

export interface BraveResult {
  title: string;
  url: string;
  description: string;
}

export function isBraveConfigured(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY);
}

export class BraveSearchError extends Error {}

/**
 * One Brave query. `count` is what we pay for in breadth, not in requests —
 * a single call returning 20 results costs the same as one returning 5, so
 * ask wide and let the ranking model discard.
 */
export async function braveSearch(query: string, count = 20): Promise<BraveResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new BraveSearchError("BRAVE_SEARCH_API_KEY is not configured.");

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 20)));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new BraveSearchError(`Brave search request failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  if (!res.ok) {
    // 429 here means the plan's quota is spent, which is a billing problem
    // rather than a user problem — worth distinguishing in the logs.
    throw new BraveSearchError(`Brave search returned ${res.status}${res.status === 429 ? " (quota exhausted)" : ""}`);
  }

  const body = (await res.json()) as { web?: { results?: unknown[] } };
  const raw = Array.isArray(body.web?.results) ? body.web!.results! : [];

  const results: BraveResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.url !== "string" || !/^https?:\/\//.test(r.url)) continue;
    if (typeof r.title !== "string" || !r.title.trim()) continue;
    results.push({
      title: r.title,
      url: r.url,
      // Brave marks query terms in descriptions with <strong> tags.
      description: typeof r.description === "string" ? r.description.replace(/<[^>]+>/g, "") : "",
    });
  }
  return results;
}
