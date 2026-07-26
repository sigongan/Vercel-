/**
 * Head-to-head extraction comparison: Claude Haiku 4.5 (current) vs Gemini
 * 3.5 Flash-Lite (candidate) on the exact same images/PDFs, same prompt.
 *
 * Usage:
 *   npm run compare:extraction -- path/to/recipe1.jpg path/to/recipe2.pdf
 *   npm run compare:extraction -- --lang=de path/to/recipe.jpg
 *
 * Needs ANTHROPIC_API_KEY and GEMINI_API_KEY in .env.local. Either can be
 * missing — that model's column is just skipped with a note, so this also
 * works to preview the Gemini path alone once only that key is set.
 *
 * Prints wall-clock latency per model and lets each SDK call's own
 * console.log line report tokens in/out (recipeParser.ts / gemini.ts already
 * log this on every call) — cost per call = (input tokens × input $/1M +
 * output tokens × output $/1M), rates in docs/cost-notes.md.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Language } from "@/lib/i18n";
import { extractFromImage } from "@/lib/extractors/image";
import { extractFromPdf } from "@/lib/extractors/pdf";
import { parseRecipeFromContent, AiNotConfiguredError as ClaudeNotConfigured } from "@/lib/ai/recipeParser";
import {
  parseRecipeFromContentViaGemini,
  AiNotConfiguredError as GeminiNotConfigured,
} from "@/lib/ai/recipeParserGemini";
import { isGeminiConfigured } from "@/lib/ai/gemini";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

function parseArgs(argv: string[]): { lang: string; files: string[] } {
  let lang = "en";
  const files: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith("--lang=")) {
      lang = arg.slice("--lang=".length);
    } else {
      files.push(arg);
    }
  }
  return { lang, files };
}

async function loadFile(filePath: string): Promise<File> {
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = MIME_BY_EXT[ext];
  if (!mediaType) {
    throw new Error(
      `Unsupported file extension "${ext}" for ${filePath}. Supported: ${Object.keys(MIME_BY_EXT).join(", ")}`,
    );
  }
  const buffer = readFileSync(filePath);
  return new File([buffer], path.basename(filePath), { type: mediaType });
}

async function main() {
  loadEnvLocal();

  const { lang, files } = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    console.error("Usage: npm run compare:extraction -- [--lang=en] <file1> <file2> ...");
    console.error("Supported files: .jpg .jpeg .png .webp .gif .pdf");
    process.exit(1);
  }

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGemini = isGeminiConfigured();
  console.log(`Claude (ANTHROPIC_API_KEY): ${hasAnthropic ? "configured" : "MISSING — skipping"}`);
  console.log(`Gemini (GEMINI_API_KEY):    ${hasGemini ? "configured" : "MISSING — skipping"}`);

  const outDir = path.resolve(process.cwd(), "scripts/compare-output");
  mkdirSync(outDir, { recursive: true });

  for (const filePath of files) {
    console.log(`\n${"=".repeat(70)}\n${filePath}\n${"=".repeat(70)}`);

    const file = await loadFile(filePath);
    const content = file.type === "application/pdf" ? await extractFromPdf(file) : await extractFromImage(file);

    const base = path.basename(filePath, path.extname(filePath));

    if (hasAnthropic) {
      const t0 = Date.now();
      try {
        const recipe = await parseRecipeFromContent(content, lang as Language);
        const ms = Date.now() - t0;
        console.log(`\n[claude-haiku-4-5] ${ms}ms — see log line above for token usage`);
        writeFileSync(path.join(outDir, `${base}.claude.json`), JSON.stringify(recipe, null, 2));
      } catch (err) {
        const ms = Date.now() - t0;
        if (err instanceof ClaudeNotConfigured) {
          console.log(`[claude-haiku-4-5] skipped — not configured`);
        } else {
          console.log(`[claude-haiku-4-5] FAILED after ${ms}ms: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    if (hasGemini) {
      const t0 = Date.now();
      try {
        const recipe = await parseRecipeFromContentViaGemini(content, lang as Language);
        const ms = Date.now() - t0;
        console.log(`\n[gemini-flash-lite] ${ms}ms — see log line above for token usage`);
        writeFileSync(path.join(outDir, `${base}.gemini.json`), JSON.stringify(recipe, null, 2));
      } catch (err) {
        const ms = Date.now() - t0;
        if (err instanceof GeminiNotConfigured) {
          console.log(`[gemini-flash-lite] skipped — not configured`);
        } else {
          console.log(`[gemini-flash-lite] FAILED after ${ms}ms: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }

  console.log(`\nFull JSON output written to ${outDir}/ — diff *.claude.json vs *.gemini.json for quality.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
