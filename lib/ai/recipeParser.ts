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

const SYSTEM_PROMPT = `You are an assistant that turns source material from YouTube, Instagram, TikTok, PDFs, screenshots, and similar sources into a structured cooking recipe.
Analyze the provided text and images and produce a recipe matching the JSON schema below.

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

JSON schema:
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

const OUTPUT_LANGUAGE_INSTRUCTION: Record<Language, string> = {
  ko: "모든 출력 값(title, description, ingredients, steps, tags, notes)은 한국어로 작성하세요. 원본이 다른 언어라면 한국어로 번역하세요.",
  en: "Write every output value (title, description, ingredients, steps, tags, notes) in English. Translate the source content if it is in another language.",
};

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function parseRecipeFromContent(content: ExtractedContent, lang: Language): Promise<Recipe> {
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
      max_tokens: 2048,
      // The instruction text is identical across every request (per language), so
      // marking it cacheable avoids re-billing the full system prompt on every call.
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
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

  let parsed: Omit<Recipe, "sourceType" | "sourceUrl">;
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
  } catch {
    throw new RecipeParseError("Could not interpret the AI response as a recipe.");
  }

  return {
    ...parsed,
    sourceType: content.sourceType,
    sourceUrl: content.sourceUrl,
  };
}
