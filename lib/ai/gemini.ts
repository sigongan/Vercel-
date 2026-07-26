/**
 * Minimal Gemini REST client — used for the parts of Recipe Scout that are
 * pure text shuffling (planning search queries, ranking and summarising
 * search hits). Flash-Lite is roughly a tenth of Haiku's token price, and
 * those two jobs need cheap and fast far more than they need clever.
 *
 * Deliberately a plain fetch rather than the SDK: it's one endpoint, and it
 * keeps a second AI vendor from pulling a dependency tree into the bundle.
 */

// Both model constants below use Google's "-latest" alias rather than a
// dated snapshot (gemini-2.5-flash, gemini-2.5-flash-lite, ...). This is the
// opposite of the rule for Anthropic models elsewhere in this codebase,
// where a dated ID is required and "-latest"/undated tags are avoided — do
// not "fix" these to match that convention. The two vendors' guidance is
// opposite on purpose: Google hot-swaps what a "-latest" alias points to on
// every release and explicitly recommends it for exactly this reason, while
// a dated Gemini snapshot is what goes stale. This is not hypothetical —
// gemini-2.5-flash (hardcoded here originally) was cut off for new API keys
// within months of launch, which is what sent every grounded search to the
// expensive Anthropic fallback until this comment was written.

/** Cheap text shuffling (query planning, ranking snippets we already have). */
const LITE_MODEL = "gemini-flash-lite-latest";

/**
 * The model used when Gemini does the web searching itself. Grounding with
 * Google Search is free for the first 1,500 searches/day on a paid key and
 * $35/1,000 after, so the free allowance — not the token price — is what
 * makes this model the right one. Overridable via GEMINI_SEARCH_MODEL as a
 * same-day fix (a Vercel env var + redeploy, no code change) if this alias
 * ever moves to a model that drops grounding support or free quota.
 */
const groundedModel = () => process.env.GEMINI_SEARCH_MODEL || "gemini-flash-latest";

const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const TIMEOUT_MS = 30_000;

export class GeminiError extends Error {}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

/** One piece of multimodal input — plain text, or an inline image/PDF (base64). */
export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * One JSON-mode call. `responseMimeType: application/json` makes Gemini emit
 * parseable JSON rather than a fenced code block, which removes the usual
 * "strip the ```json wrapper" guesswork.
 */
function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Reached when JSON mode is off (it can't be combined with the search
    // tool) or when a response was truncated — take the outermost
    // array/object, ignoring any prose the model wrapped it in.
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError("Gemini did not return parseable JSON.");
  }
}

async function callGemini(args: {
  model: string;
  system: string;
  user: string | GeminiPart[];
  maxOutputTokens?: number;
  /** Turns on Grounding with Google Search — billed per search performed. */
  grounded?: boolean;
  label: string;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not configured.");

  const parts: GeminiPart[] = typeof args.user === "string" ? [{ text: args.user }] : args.user;

  let res: Response;
  try {
    res = await fetch(endpointFor(args.model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        contents: [{ role: "user", parts }],
        ...(args.grounded ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          // responseMimeType can't be combined with the search tool, so the
          // grounded path asks for JSON in the prompt and extracts it below.
          ...(args.grounded ? {} : { responseMimeType: "application/json" }),
          temperature: 0.2,
          maxOutputTokens: args.maxOutputTokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new GeminiError(`Gemini request failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(`Gemini returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: GeminiUsage;
  };

  const usage = body.usageMetadata;
  console.log(
    `[gemini:${args.label}] model=${args.model} input=${usage?.promptTokenCount ?? "?"} output=${usage?.candidatesTokenCount ?? "?"}${args.grounded ? " grounded" : ""}`,
  );

  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new GeminiError("Gemini returned no content.");
  return text;
}

/** One cheap JSON-mode call on the lite model — no web access. */
export async function geminiJson<T>(args: {
  system: string;
  user: string;
  maxOutputTokens?: number;
  /** Shows up in logs so per-step cost stays attributable. */
  label: string;
}): Promise<T> {
  return parseJson<T>(await callGemini({ ...args, model: LITE_MODEL }));
}

/** One call that searches Google itself and answers from what it found. */
export async function geminiGroundedJson<T>(args: {
  system: string;
  user: string;
  maxOutputTokens?: number;
  label: string;
}): Promise<T> {
  return parseJson<T>(await callGemini({ ...args, model: groundedModel(), grounded: true }));
}

/**
 * One JSON-mode call on the lite model with multimodal input (images and/or
 * PDFs as inline base64 parts alongside text) — used for recipe extraction,
 * mirroring what recipeParser.ts sends to Claude for the same job.
 */
export async function geminiVisionJson<T>(args: {
  system: string;
  parts: GeminiPart[];
  maxOutputTokens?: number;
  label: string;
}): Promise<T> {
  return parseJson<T>(await callGemini({ ...args, user: args.parts, model: LITE_MODEL }));
}
