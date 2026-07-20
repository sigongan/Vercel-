import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedContent } from "@/lib/extractors";
import type { Language } from "@/lib/i18n";
import type { Recipe } from "@/lib/types/recipe";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not configured.");
  }
}

export class RecipeParseError extends Error {}

const JSON_SCHEMA = `JSON schema:
{
  "title": string,
  "description": string (optional),
  "servings": string (optional, e.g. "2 servings"),
  "prepTime": string (optional),
  "cookTime": string (optional),
  "ingredients": [{ "name": string, "amount": string, "estimated": boolean }],
  "steps": [{ "order": number, "instruction": string }],
  "tags": string[],
  "confidence": "high" | "medium" | "low",
  "notes": string (optional, anything worth flagging from extraction — briefly mention any ingredients whose amounts were estimated),
  "nutrition": { "calories": string, "protein": string, "carbs": string, "fat": string } (optional, per serving, estimated)
}

Output only the JSON object, with no other explanatory text.`;

/** "What's in your fridge" mode — inventing a dish from on-hand ingredients
 *  rather than extracting one from a source. */
const PANTRY_PROMPT = `You are a practical home-cooking assistant. The user gives you a rough list of ingredients they have on hand. Suggest ONE realistic, simple dish they can actually cook tonight, built primarily from those ingredients.

Rules:
- The listed ingredients are the stars. You may assume basic pantry staples (salt, pepper, cooking oil, water, sugar, common dried spices) and include them in the ingredient list.
- Never require an important ingredient the user didn't list — suggest it in notes as an optional upgrade instead.
- Every ingredient needs a concrete, cookable amount, marked estimated: true (they're your suggestion, not a source's).
- Steps should be short, confident, and include times where relevant.
- Fill in servings, prepTime, cookTime, tags, and the per-serving nutrition estimate.
- confidence: "high" when the ingredients make a coherent dish, "medium" when you had to stretch.
- In notes, add one short tip or variation.

${JSON_SCHEMA}`;

const SYSTEM_PROMPT = `You are an assistant that turns source material from YouTube, Instagram, TikTok, PDFs, screenshots, and similar sources into a structured cooking recipe.
Analyze the provided text and images and produce a recipe matching the JSON schema below.

Rule for sources with multiple dishes (e.g. a full holiday menu, or a main + side + sauce bundled in one post): always output exactly ONE recipe object, never an array or multiple objects. Pick the single primary/title dish — the one the source is centered on — and ignore the rest, rather than combining every dish's ingredients and steps into one. If it's genuinely a single unified menu, put the other dishes briefly in notes instead of expanding them.

Rules for ingredient amounts:
- If the source (whether an ingredient list or the instructions) states an amount, use it as-is and set estimated to false.
- If the source never states an amount for an ingredient, never leave it empty — estimate a reasonable amount from cooking knowledge, the other ingredients' amounts, and the serving count, and set that ingredient's estimated to true.
- Estimated amounts must be concrete, cookable values (e.g. "1 tbsp", "200g", "1/2 onion") — never vague phrases like "to taste" as a substitute for a real amount.
- For everything other than amounts (title, steps, etc.), leave fields empty when unsure rather than guessing.
- If the source lacks recipe information itself (ingredients or steps can't be determined), set confidence to "low". Estimating amounts alone does not lower confidence.

Nutrition estimate:
- Estimate nutrition PER SERVING from the ingredient list and serving count: calories, protein, carbs, fat.
- These are rough estimates for a home cook, not medical data — round to sensible values ("520 kcal", "32g").
- If the ingredients are too unclear to estimate at all, omit the nutrition field entirely rather than guessing wildly.

${JSON_SCHEMA}`;

const OUTPUT_LANGUAGE_INSTRUCTION: Record<Language, string> = {
  ko: "모든 출력 값(title, description, ingredients, steps, tags, notes)은 한국어로 작성하세요. 원본이 다른 언어라면 한국어로 번역하세요.",
  en: "Write every output value (title, description, ingredients, steps, tags, notes) in English. Translate the source content if it is in another language.",
};

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ParseMode = "extract" | "pantry";

export async function parseRecipeFromContent(
  content: ExtractedContent,
  lang: Language,
  mode: ParseMode = "extract",
): Promise<Recipe> {
  if (!isConfigured()) {
    throw new AiNotConfiguredError();
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contentBlocks: Anthropic.MessageParam["content"] = [];

  if (content.images) {
    for (const image of content.images) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: image.base64,
        },
      });
    }
  }

  if (content.documents) {
    for (const doc of content.documents) {
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: doc.base64 },
      });
    }
  }

  const textParts = [
    content.title ? `Title/source: ${content.title}` : null,
    content.sourceUrl ? `Source link: ${content.sourceUrl}` : null,
    content.text ? `Content:\n${content.text}` : null,
  ].filter(Boolean);

  contentBlocks.push({ type: "text", text: textParts.join("\n\n") || "(no text available — use the images)" });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5",
      // Long real-world sources (a full holiday menu, a detailed multi-page
      // recipe) need more room than a typical single dish — 2048 was
      // measured to truncate mid-JSON on those, which then fails to parse
      // below and surfaces as a confusing generic error.
      max_tokens: 4096,
      // The instruction text is identical across every request (per language), so
      // marking it cacheable avoids re-billing the full system prompt on every call.
      system: [
        {
          type: "text",
          text: mode === "pantry" ? PANTRY_PROMPT : SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: OUTPUT_LANGUAGE_INSTRUCTION[lang], cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: contentBlocks }],
    });
  } catch (err) {
    console.error("Anthropic API request failed", err);
    if (err instanceof Anthropic.APIError) {
      throw new RecipeParseError("Something went wrong while processing with AI. Please try again in a moment.");
    }
    throw err;
  }

  console.log(
    `[recipeParser] model=${message.model} input=${message.usage.input_tokens} output=${message.usage.output_tokens} cache_write=${message.usage.cache_creation_input_tokens ?? 0} cache_read=${message.usage.cache_read_input_tokens ?? 0}`
  );

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new RecipeParseError("The AI response contained no text.");
  }

  let parsed: Partial<Omit<Recipe, "sourceType" | "sourceUrl">>;
  try {
    // Despite the system prompt now saying "always one object, never an
    // array", a multi-dish source occasionally still gets the model to emit
    // a JSON array of recipes anyway — fall back to its first element
    // rather than failing outright.
    const arrayMatch = textBlock.text.match(/\[[\s\S]*\]/);
    const objectMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (arrayMatch && (!objectMatch || arrayMatch.index! <= objectMatch.index!)) {
      const asArray = JSON.parse(arrayMatch[0]);
      if (!Array.isArray(asArray) || asArray.length === 0) throw new Error("empty array");
      parsed = asArray[0];
    } else {
      parsed = JSON.parse(objectMatch ? objectMatch[0] : textBlock.text);
    }
  } catch {
    // A common real cause: the source was long enough (a full multi-course
    // menu, a very detailed recipe) that the JSON got cut off mid-object
    // before max_tokens was reached — surface that distinctly since "try a
    // screenshot instead" (the generic message) is the wrong advice there.
    if (message.stop_reason === "max_tokens") {
      throw new RecipeParseError(
        "This source was too long to fully process. Try a shorter excerpt, or split it into separate recipes.",
      );
    }
    throw new RecipeParseError("Could not interpret the AI response as a recipe.");
  }

  // The model sometimes reports low confidence by omitting fields rather
  // than emitting the documented empty-array/empty-string shape (seen with
  // non-recipe source text) — normalize so callers can always rely on the
  // Recipe type's required fields actually being present, and treat "found
  // nothing at all" as the extraction failure it is instead of a fake
  // success the UI would then fail to render.
  const ingredients = parsed.ingredients ?? [];
  const steps = parsed.steps ?? [];
  if (ingredients.length === 0 && steps.length === 0) {
    throw new RecipeParseError(
      "Couldn't find a recipe in that content. Try pasting the recipe text directly, or a clearer source.",
    );
  }

  return {
    title: parsed.title || "Untitled recipe",
    description: parsed.description,
    servings: parsed.servings,
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    ingredients,
    steps,
    tags: parsed.tags ?? [],
    confidence: parsed.confidence,
    notes: parsed.notes,
    nutrition: parsed.nutrition,
    sourceType: content.sourceType,
    sourceUrl: content.sourceUrl,
  };
}
