import type { ExtractedContent } from "@/lib/extractors";
import type { Language } from "@/lib/i18n";
import type { Recipe } from "@/lib/types/recipe";
import { geminiVisionJson, isGeminiConfigured, GeminiError, type GeminiPart } from "@/lib/ai/gemini";
import { SYSTEM_PROMPT, OUTPUT_LANGUAGE_INSTRUCTION, normalizeRecipe, RecipeParseError } from "@/lib/ai/recipeParser";

/**
 * Gemini side of the extraction cost comparison (see docs/cost-notes.md).
 * Same prompt, same schema, same normalization as the Claude path in
 * recipeParser.ts — only the model and request shape differ, so a head-to-head
 * comparison isolates the model, not the prompt.
 */

export class AiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured.");
  }
}

function buildParts(content: ExtractedContent): GeminiPart[] {
  const parts: GeminiPart[] = [];

  if (content.images) {
    for (const image of content.images) {
      parts.push({ inlineData: { mimeType: image.mediaType, data: image.base64 } });
    }
  }

  if (content.documents) {
    for (const doc of content.documents) {
      parts.push({ inlineData: { mimeType: doc.mediaType, data: doc.base64 } });
    }
  }

  const textParts = [
    content.title ? `Title/source: ${content.title}` : null,
    content.sourceUrl ? `Source link: ${content.sourceUrl}` : null,
    content.text ? `Content:\n${content.text}` : null,
  ].filter(Boolean);

  parts.push({ text: textParts.join("\n\n") || "(no text available — use the images)" });
  return parts;
}

export async function parseRecipeFromContentViaGemini(
  content: ExtractedContent,
  lang: Language,
): Promise<Recipe> {
  if (!isGeminiConfigured()) {
    throw new AiNotConfiguredError();
  }

  const system = `${SYSTEM_PROMPT}\n\n${OUTPUT_LANGUAGE_INSTRUCTION[lang]}`;

  let parsed: Partial<Omit<Recipe, "sourceType" | "sourceUrl">>;
  try {
    parsed = await geminiVisionJson<Partial<Omit<Recipe, "sourceType" | "sourceUrl">>>({
      system,
      parts: buildParts(content),
      maxOutputTokens: 4096,
      label: "recipeParser",
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      throw new RecipeParseError(`Gemini extraction failed: ${err.message}`);
    }
    throw err;
  }

  const recipe = normalizeRecipe(parsed, content);
  if (!recipe) {
    throw new RecipeParseError(
      "Couldn't find a recipe in that content. Try pasting the recipe text directly, or a clearer source.",
    );
  }
  return recipe;
}
