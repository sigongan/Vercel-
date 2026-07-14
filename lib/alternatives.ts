/**
 * Data for /alternatives (hub) and /alternatives/[slug] (comparison pages).
 * Claims here are based on each competitor's own public marketing pages as
 * of mid-2026 — kept conservative and hedged where their site was unclear,
 * since a comparison page with inaccurate claims does more harm than good.
 */

export interface Alternative {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  /** Short, fair summary of what they actually do well. */
  strengths: string[];
  /** Comparison table rows. `them` / `us`: true = yes, false = no, string = short caveat. */
  rows: { feature: string; them: boolean | string; us: boolean | string }[];
  /** Honest "pick them if..." guidance — this is what makes the page trustworthy. */
  chooseThemIf: string[];
  chooseUsIf: string[];
}

export const ALTERNATIVES: Alternative[] = [
  {
    slug: "recipeextractor",
    name: "RecipeExtractor.com",
    url: "https://recipeextractor.com",
    tagline: "A free, no-account tool that pulls recipe text out of YouTube, TikTok, Instagram, and blog links.",
    strengths: [
      "Completely free, including video links — no account, no paywall",
      "Works with a huge range of recipe blogs and social platforms",
      "Multi-language translation",
    ],
    rows: [
      { feature: "Extract from a link (YouTube/TikTok/Instagram)", them: true, us: true },
      { feature: "Paste recipe text directly", them: true, us: true },
      { feature: "Extract from a screenshot, photo, or PDF upload", them: false, us: true },
      { feature: "Multiple print-ready card designs", them: false, us: true },
      { feature: "Cost & margin calculator", them: false, us: true },
      { feature: "Save recipes into folders/collections", them: true, us: true },
      { feature: "No account needed to try", them: true, us: true },
    ],
    chooseThemIf: [
      "You only ever start from a link, never a photo or screenshot",
      "You want zero-friction, no account, no limits at all",
      "You don't care about print layout or business costing tools",
    ],
    chooseUsIf: [
      "You often work from a screenshot, photo, or PDF — not just links",
      "You want the result to look good enough to print and keep",
      "You sell food and need to know your actual cost per portion",
    ],
  },
  {
    slug: "justtherecipe",
    name: "JustTheRecipe",
    url: "https://www.justtherecipe.com",
    tagline: "A free ad-stripping tool with a companion app for shopping lists and video recipe imports.",
    strengths: [
      "Very good at removing ads and life-story clutter from blog posts",
      "Shopping list sorted by aisle, cross-device sync",
      "Recipe editing and photo swapping built in",
    ],
    rows: [
      { feature: "Extract from a link (website)", them: true, us: true },
      { feature: "Extract from TikTok/Instagram video", them: "App only, may require a subscription", us: true },
      { feature: "Paste recipe text directly", them: false, us: true },
      { feature: "Extract from a screenshot, photo, or PDF upload", them: false, us: true },
      { feature: "Multiple print-ready card designs", them: false, us: true },
      { feature: "Cost & margin calculator", them: false, us: true },
      { feature: "Save recipes into collections", them: true, us: true },
      { feature: "No account needed to try", them: "1 recipe", us: "1 recipe" },
    ],
    chooseThemIf: [
      "You mainly clip recipes from blogs and want a companion shopping-list app",
      "You're fine using a separate app for video imports",
      "You don't need print-ready layouts or costing tools",
    ],
    chooseUsIf: [
      "You want video, photo, PDF, and text extraction all in one place, on the web",
      "You want a result designed to be printed or saved, not just a stripped-down text view",
      "You want a margin calculator alongside the recipe, not a separate tool",
    ],
  },
];

export function getAlternative(slug: string): Alternative | undefined {
  return ALTERNATIVES.find((a) => a.slug === slug);
}
