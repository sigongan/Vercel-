export type SourceType = "image" | "pdf" | "video-file" | "youtube" | "instagram" | "tiktok" | "url" | "text";

export interface Ingredient {
  name: string;
  amount?: string;
  /** true when the source didn't specify an amount and the AI estimated a reasonable one */
  estimated?: boolean;
}

export interface RecipeStep {
  order: number;
  instruction: string;
}

/**
 * A component that is itself a mini-recipe — the frangipane inside an almond
 * croissant, a curry paste, a marinade, a sauce. These show up in the main
 * ingredient list as a single line ("Frangipane (almond cream filling)"),
 * which isn't cookable on its own, so each one carries its own ingredients
 * and steps.
 */
export interface SubRecipe {
  /** Matches the parent ingredient's name exactly, so the two read together. */
  name: string;
  /** What this makes, when worth stating ("about 250g"). */
  yield?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  /** true when the source only named this component and the AI reconstructed
   *  its recipe from culinary knowledge. */
  estimated?: boolean;
}

/** AI-estimated nutrition per serving — always approximate, shown with a disclaimer. */
export interface Nutrition {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export interface Recipe {
  title: string;
  description?: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  /** Components from the ingredient list that have to be made, not bought. */
  subRecipes?: SubRecipe[];
  tags: string[];
  sourceType: SourceType;
  sourceUrl?: string;
  confidence?: "high" | "medium" | "low";
  notes?: string;
  nutrition?: Nutrition;
}

export interface ExtractRecipeError {
  error: string;
  code:
    | "AI_NOT_CONFIGURED"
    | "INVALID_INPUT"
    | "EXTRACTION_FAILED"
    | "UNSUPPORTED_SOURCE"
    | "AUTH_REQUIRED"
    | "QUOTA_EXCEEDED"
    | "RATE_LIMITED";
}

export type ExtractRecipeResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; error: ExtractRecipeError };
