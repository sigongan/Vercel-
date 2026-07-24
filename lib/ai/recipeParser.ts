import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedContent } from "@/lib/extractors";
import type { Language } from "@/lib/i18n";
import type { Recipe, SubRecipe } from "@/lib/types/recipe";

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
  "subRecipes": [{ "name": string, "yield": string (optional), "ingredients": [{ "name": string, "amount": string, "estimated": boolean }], "steps": [{ "order": number, "instruction": string }], "estimated": boolean }] (optional),
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

How much you reconstruct depends on how much the source gives you. Social posts very often show a dish without sharing its recipe — a caption like "POV: the best garlic pasta of your life 😍", a bare video title, hashtags, or just a photo of the finished plate. Your job is to always deliver a cookable recipe anyway:
- If the source contains the full recipe, extract it faithfully — what the source states always wins over your own ideas.
- If the source gives only part of the recipe (say, an ingredient list with no steps, or a caption naming half the ingredients), keep everything the source states and fill in the missing parts yourself, the way an experienced cook who just watched that video would.
- If the source only identifies the dish — a name, hashtags, or a photo — build a complete, realistic recipe for that dish from culinary knowledge: full ingredient list with amounts, clear steps, times, servings. Match any cues the source gives (cuisine, cooking style, specific ingredients visible or mentioned).
- Only output empty "ingredients" and "steps" arrays when you cannot even tell what dish the source is about (clearly non-food content). Never refuse or explain outside the JSON.
- Whenever you reconstructed most or all of the recipe, start notes with one plain sentence saying the source didn't include the full recipe, so this is your closest reconstruction of the dish (in the output language — matter-of-fact, no apologies).

Rules for ingredient amounts:
- If the source (whether an ingredient list or the instructions) states an amount, use it as-is and set estimated to false.
- If the source never states an amount for an ingredient, never leave it empty — estimate a reasonable amount from cooking knowledge, the other ingredients' amounts, and the serving count, and set that ingredient's estimated to true.
- Estimated amounts must be concrete, cookable values (e.g. "1 tbsp", "200g", "1/2 onion") — never vague phrases like "to taste" as a substitute for a real amount.

Component sub-recipes:
- Some ingredients aren't things you buy — they're components you have to make first: a frangipane or pastry cream filling, a curry paste, a marinade, a tare, a spice blend, a sauce, a dough, a simple syrup, a stock, a compound butter. When one of those appears in the main ingredient list as a single line, the recipe isn't actually cookable from that list alone.
- Give every such ingredient its own entry in "subRecipes": a full ingredient list with concrete amounts, plus the steps to make it, sized to produce roughly what the main recipe calls for.
- Its "name" must repeat the main ingredient's name exactly, so a reader can match the two.
- If the source spells that component's recipe out, use the source's version and set that sub-recipe's "estimated" to false. If the source only names it, reconstruct the standard version from culinary knowledge and set "estimated" to true.
- Only components that genuinely need making. Ordinary shop-bought ingredients — butter, soy sauce, canned tomatoes, or store-bought pastry the recipe means for you to buy — never get a sub-recipe. If nothing qualifies, omit "subRecipes" entirely.
- Keep each one tight: what's needed to make that single component, nothing more. Never restate the main recipe's own steps there.

confidence:
- "high": the source itself contained the recipe (estimating a few amounts doesn't lower this).
- "medium": the source had real recipe information but you reconstructed meaningful parts.
- "low": you reconstructed essentially the whole recipe from the dish name/photo alone.

Nutrition estimate:
- Estimate nutrition PER SERVING from the ingredient list and serving count: calories, protein, carbs, fat.
- These are rough estimates for a home cook, not medical data — round to sensible values ("520 kcal", "32g").
- If the ingredients are too unclear to estimate at all, omit the nutrition field entirely rather than guessing wildly.

${JSON_SCHEMA}`;

const COUNT_WORDS: Record<number, string> = { 1: "ONE", 2: "TWO", 3: "THREE" };

/** "What should I eat today?" — Home's photo/text pantry card. Same idea as
 *  PANTRY_PROMPT but asks for one or more distinct options instead of
 *  committing to a single dish, and accepts a fridge/pantry photo instead of
 *  just a typed list. */
function buildPantrySuggestionsPrompt(count: number): string {
  const word = COUNT_WORDS[count] ?? COUNT_WORDS[3];
  return `You are a practical home-cooking assistant helping someone decide what to cook right now. They'll show you what they have — a photo of their fridge/pantry/counter, and/or a typed list of ingredients, which may be as short as a single item (e.g. just "chicken"). Suggest exactly ${word} realistic, simple dish${count === 1 ? "" : "es"} they could cook tonight, ${count === 1 ? "built" : "each built"} primarily from what they have.

Rules:
- If a photo is provided, identify the ingredients yourself from what's actually visible — don't invent items that aren't shown or listed.
- However sparse the input is — even a single ingredient with no other context — never ask a clarifying question and never reply with anything other than the JSON array below. Use your own culinary judgment to fill the gaps: pick ${count === 1 ? "a complete, realistic dish" : "genuinely different, complete, realistic dishes"} built around whatever was given, the way an experienced cook would riff on one ingredient.
- If the user stated a cuisine and/or cooking method preference, lean into it for all dishes when it's a reasonable fit for the ingredients; otherwise use your best judgment${count > 1 ? " and vary the styles across them" : ""}.
${count > 1 ? "- The suggestions must be meaningfully different dishes, not variations of the same one.\n" : ""}- You may assume basic pantry staples (salt, pepper, cooking oil, water, sugar, common dried spices) and include them in each ingredient list.
- Never require an important ingredient that wasn't shown/listed — suggest it in that dish's notes as an optional upgrade instead.
- Every ingredient needs a concrete, cookable amount, marked estimated: true (these are your suggestions, not a source's).
- Steps should be short, confident, and include times where relevant.
- Fill in servings, prepTime, cookTime, tags, and a per-serving nutrition estimate for each dish.
- confidence: "high" when the ingredients make a coherent dish, "medium" when you had to stretch.
- In notes, add one short tip or variation for each dish.

Output a JSON array of exactly ${count} object${count === 1 ? "" : "s"}, each matching this schema:
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
  "notes": string (optional),
  "nutrition": { "calories": string, "protein": string, "carbs": string, "fat": string } (optional, per serving, estimated)
}

Output only the JSON array, with no other explanatory text.`;
}

const OUTPUT_LANGUAGE_INSTRUCTION: Record<Language, string> = {
  en: "Write every output value (title, description, ingredients, steps, tags, notes) in English. Translate the source content if it is in another language.",
  de: "Schreibe jeden Ausgabewert (title, description, ingredients, steps, tags, notes) auf Deutsch. Übersetze den Quellinhalt, falls er in einer anderen Sprache vorliegt.",
  it: "Scrivi ogni valore di output (title, description, ingredients, steps, tags, notes) in italiano. Traduci il contenuto originale se è in un'altra lingua.",
  es: "Escribe cada valor de salida (title, description, ingredients, steps, tags, notes) en español. Traduce el contenido de origen si está en otro idioma.",
  fr: "Rédige chaque valeur de sortie (title, description, ingredients, steps, tags, notes) en français. Traduis le contenu source s'il est dans une autre langue.",
  pt: "Escreva cada valor de saída (title, description, ingredients, steps, tags, notes) em português. Traduza o conteúdo de origem se estiver em outro idioma.",
};

const CUISINE_LABELS: Record<string, string> = {
  korean: "Korean",
  italian: "Italian",
  mexican: "Mexican",
  chinese: "Chinese",
  american: "American",
};

const METHOD_LABELS: Record<string, string> = {
  roast: "roasting",
  fry: "pan-frying/sautéing",
  grill: "grilling",
  soup: "soup or stew",
  bake: "baking",
};

export interface PantryPreferences {
  cuisine?: string;
  method?: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildContentBlocks(content: ExtractedContent): Anthropic.ContentBlockParam[] {
  const contentBlocks: Anthropic.ContentBlockParam[] = [];

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
  return contentBlocks;
}

async function callClaude(
  systemPrompt: string,
  lang: Language,
  contentBlocks: Anthropic.MessageParam["content"],
): Promise<Anthropic.Message> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    return await client.messages.create({
      model: "claude-haiku-4-5",
      // Long real-world sources (a full holiday menu, a detailed multi-page
      // recipe, three full suggested dishes) need more room than a typical
      // single dish — 2048 was measured to truncate mid-JSON on those, which
      // then fails to parse below and surfaces as a confusing generic error.
      max_tokens: 4096,
      // The instruction text is identical across every request (per language), so
      // marking it cacheable avoids re-billing the full system prompt on every call.
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
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
}

/** Drops malformed sub-recipes rather than rendering half-empty component
 *  cards — one with neither ingredients nor steps tells a cook nothing. */
function normalizeSubRecipes(raw: unknown): SubRecipe[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const cleaned: SubRecipe[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const sub = item as Partial<SubRecipe>;
    if (typeof sub.name !== "string" || !sub.name.trim()) continue;

    const ingredients = Array.isArray(sub.ingredients) ? sub.ingredients : [];
    const steps = Array.isArray(sub.steps) ? sub.steps : [];
    if (ingredients.length === 0 && steps.length === 0) continue;

    cleaned.push({
      name: sub.name.trim(),
      yield: typeof sub.yield === "string" && sub.yield.trim() ? sub.yield.trim() : undefined,
      ingredients,
      steps,
      estimated: sub.estimated === true,
    });
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Fills in the required Recipe fields the model sometimes omits instead of
 *  emitting the documented empty-array/empty-string shape (seen with
 *  non-recipe source text), and reports whether there was anything usable
 *  at all — callers decide what "nothing found" means for their case. */
function normalizeRecipe(
  parsed: Partial<Omit<Recipe, "sourceType" | "sourceUrl">>,
  content: Pick<ExtractedContent, "sourceType" | "sourceUrl">,
): Recipe | null {
  const ingredients = parsed.ingredients ?? [];
  const steps = parsed.steps ?? [];
  if (ingredients.length === 0 && steps.length === 0) return null;

  return {
    title: parsed.title || "Untitled recipe",
    description: parsed.description,
    servings: parsed.servings,
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    ingredients,
    steps,
    subRecipes: normalizeSubRecipes(parsed.subRecipes),
    tags: parsed.tags ?? [],
    confidence: parsed.confidence,
    notes: parsed.notes,
    nutrition: parsed.nutrition,
    sourceType: content.sourceType,
    sourceUrl: content.sourceUrl,
  };
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

  const message = await callClaude(
    mode === "pantry" ? PANTRY_PROMPT : SYSTEM_PROMPT,
    lang,
    buildContentBlocks(content),
  );

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

  const recipe = normalizeRecipe(parsed, content);
  if (!recipe) {
    throw new RecipeParseError(
      "Couldn't find a recipe in that content. Try pasting the recipe text directly, or a clearer source.",
    );
  }
  return recipe;
}

/**
 * "What should I eat today?" — Home's pantry card. Same content pipeline as
 * parseRecipeFromContent, but asks for three distinct dish ideas instead of
 * one, returned as a JSON array.
 */
export async function parsePantrySuggestions(
  content: ExtractedContent,
  lang: Language,
  preferences?: PantryPreferences,
  count: number = 3,
): Promise<Recipe[]> {
  if (!isConfigured()) {
    throw new AiNotConfiguredError();
  }
  const requestedCount = [1, 2, 3].includes(count) ? count : 3;

  const contentBlocks = buildContentBlocks(content);
  const cuisineLabel = preferences?.cuisine && CUISINE_LABELS[preferences.cuisine];
  const methodLabel = preferences?.method && METHOD_LABELS[preferences.method];
  if (cuisineLabel || methodLabel) {
    const parts = [
      cuisineLabel ? `Preferred cuisine: ${cuisineLabel}.` : null,
      methodLabel ? `Preferred cooking method: ${methodLabel}.` : null,
    ].filter(Boolean);
    contentBlocks.push({ type: "text", text: parts.join(" ") });
  }

  const message = await callClaude(buildPantrySuggestionsPrompt(requestedCount), lang, contentBlocks);

  console.log(
    `[recipeParser:pantry-suggestions] model=${message.model} input=${message.usage.input_tokens} output=${message.usage.output_tokens} cache_write=${message.usage.cache_creation_input_tokens ?? 0} cache_read=${message.usage.cache_read_input_tokens ?? 0}`
  );

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new RecipeParseError("The AI response contained no text.");
  }

  let parsedArray: unknown;
  try {
    const arrayMatch = textBlock.text.match(/\[[\s\S]*\]/);
    parsedArray = JSON.parse(arrayMatch ? arrayMatch[0] : textBlock.text);
  } catch {
    if (message.stop_reason === "max_tokens") {
      throw new RecipeParseError("That took a bit too long to think through. Please try again.");
    }
    throw new RecipeParseError("Could not come up with suggestions from that. Please try again.");
  }

  if (!Array.isArray(parsedArray)) {
    throw new RecipeParseError("Could not come up with suggestions from that. Please try again.");
  }

  const recipes = parsedArray
    .map((item) => normalizeRecipe(item as Partial<Omit<Recipe, "sourceType" | "sourceUrl">>, content))
    .filter((r): r is Recipe => r !== null)
    .slice(0, requestedCount);

  if (recipes.length === 0) {
    throw new RecipeParseError(
      "Couldn't tell what's in that photo or list. Try a clearer photo, or list a few ingredients instead.",
    );
  }

  return recipes;
}
