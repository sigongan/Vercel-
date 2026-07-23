import { ExtractedContent, ExtractionError } from "./types";

/**
 * Generic recipe-website extractor — AllRecipes, food blogs, newspaper
 * recipe pages, anything with a URL. Most recipe sites embed schema.org
 * Recipe JSON-LD for Google's recipe cards; when present that's pulled out
 * directly (clean, complete, ad-free). Otherwise the page is stripped to
 * text and the AI finds the recipe in it.
 */

const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_CHARS = 15_000;
const FETCH_TIMEOUT_MS = 10_000;

/** Basic SSRF guard: only public-looking http(s) hosts. */
function assertFetchableUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    isIp ||
    !host.includes(".") ||
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new ExtractionError("That is not a valid URL.", "INVALID_INPUT");
  }
}

interface JsonLdRecipe {
  name?: string;
  description?: string;
  recipeYield?: unknown;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeIngredient?: unknown;
  recipeInstructions?: unknown;
}

function findJsonLdRecipe(html: string): JsonLdRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const [, body] of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.trim());
    } catch {
      continue;
    }
    // JSON-LD comes as a single object, an array, or an @graph — flatten all.
    const candidates: unknown[] = [];
    const push = (node: unknown) => {
      if (Array.isArray(node)) node.forEach(push);
      else if (node && typeof node === "object") {
        candidates.push(node);
        const graph = (node as Record<string, unknown>)["@graph"];
        if (graph) push(graph);
      }
    };
    push(parsed);

    for (const node of candidates) {
      const type = (node as Record<string, unknown>)["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.some((t) => typeof t === "string" && t.toLowerCase() === "recipe")) {
        return node as JsonLdRecipe;
      }
    }
  }
  return null;
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        // HowToStep / HowToSection
        if (typeof o.text === "string") return o.text;
        if (Array.isArray(o.itemListElement)) return asStringList(o.itemListElement).join("\n");
      }
      return "";
    })
    .filter(Boolean);
}

function jsonLdToText(recipe: JsonLdRecipe): string {
  const parts = [
    recipe.name ? `Recipe: ${recipe.name}` : null,
    recipe.description ? `Description: ${recipe.description}` : null,
    recipe.recipeYield ? `Yield: ${asStringList(recipe.recipeYield).join(", ") || String(recipe.recipeYield)}` : null,
    recipe.prepTime ? `Prep time: ${recipe.prepTime}` : null,
    recipe.cookTime ? `Cook time: ${recipe.cookTime}` : null,
    recipe.totalTime ? `Total time: ${recipe.totalTime}` : null,
    asStringList(recipe.recipeIngredient).length
      ? `Ingredients:\n${asStringList(recipe.recipeIngredient).map((s) => `- ${s}`).join("\n")}`
      : null,
    asStringList(recipe.recipeInstructions).length
      ? `Instructions:\n${asStringList(recipe.recipeInstructions).map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export async function extractFromWebsite(rawUrl: string): Promise<ExtractedContent> {
  const url = new URL(rawUrl);
  assertFetchableUrl(url);

  let html: string;
  let blocked = false;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        // A handful of recipe blogs sit behind bot-detection (Cloudflare etc.)
        // that keys off missing browser-only headers as much as the UA
        // string — these cost nothing to send and occasionally make the
        // difference between a real page and a challenge/block response.
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (res.status === 403 || res.status === 429) blocked = true;
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    html = (await res.text()).slice(0, MAX_HTML_BYTES);
  } catch {
    throw new ExtractionError(
      blocked
        ? "That site is blocking automated requests. Copy the recipe text and paste it in the Text tab instead."
        : "Could not load that page. Check the link, or copy the recipe text and paste it in the Text tab.",
      "EXTRACTION_FAILED"
    );
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? htmlToText(titleMatch[1]).slice(0, 200) : undefined;

  const jsonLd = findJsonLdRecipe(html);
  const text = jsonLd ? jsonLdToText(jsonLd) : htmlToText(html);

  if (!text) {
    throw new ExtractionError(
      "That page had no readable content. Copy the recipe text and paste it in the Text tab instead.",
      "EXTRACTION_FAILED"
    );
  }

  return { sourceType: "url", sourceUrl: rawUrl, title, text };
}
