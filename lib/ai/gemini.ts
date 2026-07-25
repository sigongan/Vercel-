/**
 * Minimal Gemini REST client — used for the parts of Recipe Scout that are
 * pure text shuffling (planning search queries, ranking and summarising
 * search hits). Flash-Lite is roughly a tenth of Haiku's token price, and
 * those two jobs need cheap and fast far more than they need clever.
 *
 * Deliberately a plain fetch rather than the SDK: it's one endpoint, and it
 * keeps a second AI vendor from pulling a dependency tree into the bundle.
 */

const MODEL = "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 20_000;

export class GeminiError extends Error {}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

/**
 * One JSON-mode call. `responseMimeType: application/json` makes Gemini emit
 * parseable JSON rather than a fenced code block, which removes the usual
 * "strip the ```json wrapper" guesswork.
 */
export async function geminiJson<T>(args: {
  system: string;
  user: string;
  maxOutputTokens?: number;
  /** Shows up in logs so per-step cost stays attributable. */
  label: string;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not configured.");

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        contents: [{ role: "user", parts: [{ text: args.user }] }],
        generationConfig: {
          responseMimeType: "application/json",
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
    `[gemini:${args.label}] model=${MODEL} input=${usage?.promptTokenCount ?? "?"} output=${usage?.candidatesTokenCount ?? "?"}`,
  );

  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new GeminiError("Gemini returned no content.");

  try {
    return JSON.parse(text) as T;
  } catch {
    // JSON mode should make this unreachable, but a truncated response
    // (maxOutputTokens) still lands here — try the outermost array/object.
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
