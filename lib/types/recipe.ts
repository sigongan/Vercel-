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
