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
}

export interface ExtractRecipeError {
  error: string;
  code: "AI_NOT_CONFIGURED" | "INVALID_INPUT" | "EXTRACTION_FAILED" | "UNSUPPORTED_SOURCE";
}

export type ExtractRecipeResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; error: ExtractRecipeError };
