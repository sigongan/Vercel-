import type { Ingredient, Recipe } from "@/lib/types/recipe";

/**
 * Smart US→metric conversion for ingredient amounts: "1 cup flour" → "120g",
 * "3 tbsp butter" → "43g", "1 cup milk" → "240ml". Volume→weight depends on
 * what the ingredient is (a cup of flour and a cup of butter weigh nothing
 * alike), so ingredient names are matched against a density table; liquids
 * convert to ml (their natural metric unit), unknown dry ingredients fall
 * back to ml too rather than guessing a weight. Amounts that aren't
 * US-volume/weight ("2 cloves", "250g", "1 onion") are left untouched.
 */
export type UnitSystem = "original" | "metric";

const ML_PER: Record<string, number> = {
  cup: 240,
  tbsp: 15,
  tsp: 5,
  floz: 30,
  pint: 473,
  quart: 946,
  gallon: 3785,
};

// Grams per cup, matched against the ingredient name (first hit wins, so
// more specific phrases sort before generic ones). null = liquid: show ml.
const DENSITY_RULES: [string[], number | null][] = [
  // liquids → ml
  [["water", "milk", "cream", "broth", "stock", "juice", "wine", "vinegar", "oil", "sauce", "coffee", "beer", "coconut milk"], null],
  // fats & sweeteners
  [["butter", "margarine", "shortening", "lard"], 227],
  [["honey", "syrup", "molasses", "condensed milk"], 340],
  [["peanut butter", "tahini", "nutella"], 258],
  // flours & powders
  [["powdered sugar", "icing sugar", "confectioner"], 120],
  [["brown sugar"], 220],
  [["sugar"], 200],
  [["cocoa"], 100],
  [["cornstarch", "corn starch", "potato starch"], 120],
  [["flour"], 120],
  [["baking powder"], 192],
  [["baking soda"], 220],
  [["salt"], 288],
  // grains & such
  [["rice"], 185],
  [["oats", "oatmeal"], 90],
  [["quinoa"], 170],
  [["breadcrumbs", "bread crumbs"], 110],
  [["panko"], 60],
  // dairy & cheese
  [["yogurt", "sour cream", "mayonnaise", "mayo"], 245],
  [["parmesan", "pecorino"], 100],
  [["cheese"], 113],
  [["ricotta", "cottage cheese"], 250],
  // add-ins
  [["chocolate chips", "chocolate"], 170],
  [["almond", "walnut", "pecan", "peanut", "cashew", "nut"], 120],
  [["raisin", "cranberr", "dried fruit"], 150],
  [["spinach", "kale", "herbs", "parsley", "cilantro", "basil"], 30],
  // generic spices measured in small amounts
  [["pepper", "paprika", "cumin", "cinnamon", "turmeric", "oregano", "thyme", "chili", "curry", "garlic powder", "onion powder", "spice"], 110],
];

const UNIT_ALIASES: [RegExp, keyof typeof ML_PER | "oz" | "lb" | "stick"][] = [
  [/^(cups?|c\.)$/i, "cup"],
  [/^(tablespoons?|tbsps?|tbs|tb)\.?$/i, "tbsp"],
  [/^(teaspoons?|tsps?)\.?$/i, "tsp"],
  [/^(fl\.?\s?oz|fluid ounces?)$/i, "floz"],
  [/^(ounces?|oz)\.?$/i, "oz"],
  [/^(pounds?|lbs?)\.?$/i, "lb"],
  [/^(pints?|pt)\.?$/i, "pint"],
  [/^(quarts?|qt)\.?$/i, "quart"],
  [/^(gallons?|gal)\.?$/i, "gallon"],
  [/^sticks?$/i, "stick"],
];

const FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅕": 0.2, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

function parseQty(raw: string): number | null {
  const s = raw.trim();

  const unicode = s.match(/^(\d+)?\s*([¼½¾⅓⅔⅕⅛⅜⅝⅞])/);
  if (unicode) {
    return (unicode[1] ? parseInt(unicode[1], 10) : 0) + FRACTIONS[unicode[2]];
  }

  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);

  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);

  const dec = s.match(/^(\d+(?:\.\d+)?)$/);
  if (dec) return parseFloat(dec[1]);

  return null;
}

function gramsPerCup(name: string): number | null | undefined {
  const n = name.toLowerCase();
  for (const [keywords, density] of DENSITY_RULES) {
    if (keywords.some((k) => n.includes(k))) return density;
  }
  return undefined; // unknown ingredient
}

function round(g: number): number {
  if (g >= 100) return Math.round(g / 5) * 5;
  if (g >= 10) return Math.round(g);
  return Math.round(g * 10) / 10;
}

function convertOne(qty: number, unit: string, name: string): string | null {
  if (unit === "oz") return `${round(qty * 28.35)}g`;
  if (unit === "lb") return `${round(qty * 453.6)}g`;
  if (unit === "stick") {
    // Sticks are a butter-specific US measure.
    return name.toLowerCase().includes("butter") ? `${round(qty * 113)}g` : null;
  }

  const ml = ML_PER[unit];
  if (!ml) return null;

  const density = gramsPerCup(name);
  if (density === null || density === undefined) {
    // Liquid or unknown: ml is exact for the volume either way.
    return `${round(qty * ml)}ml`;
  }
  return `${round((qty * ml * density) / 240)}g`;
}

/**
 * Converts one amount string ("1 cup", "1 1/2 tbsp", "1-2 tsp") for the
 * given ingredient name. Returns null when there's nothing to convert
 * (already metric, count-based, or unrecognized) — caller keeps the original.
 */
export function convertAmount(amount: string, name: string): string | null {
  const m = amount.trim().match(
    /^([\d¼½¾⅓⅔⅕⅛⅜⅝⅞./\s]+?)(?:\s*(?:-|–|—|to)\s*([\d¼½¾⅓⅔⅕⅛⅜⅝⅞./\s]+?))?\s*([a-zA-Z.]+(?:\s?oz)?)\s*(.*)$/
  );
  if (!m) return null;

  const [, q1raw, q2raw, unitRaw, rest] = m;
  const alias = UNIT_ALIASES.find(([re]) => re.test(unitRaw.trim()));
  if (!alias) return null;
  const unit = alias[1];

  const q1 = parseQty(q1raw);
  if (q1 === null) return null;

  const c1 = convertOne(q1, unit, name);
  if (!c1) return null;

  if (q2raw) {
    const q2 = parseQty(q2raw);
    const c2 = q2 !== null ? convertOne(q2, unit, name) : null;
    if (c2) return `${c1.replace(/(g|ml)$/, "")}–${c2}`;
  }

  const trailing = rest.trim();
  return trailing ? `${c1} ${trailing}` : c1;
}

/* ---------- Serving scaling ---------- */

/** "2 servings" / "Serves 4" / "4인분" → 2 / 4 / 4. Null when no number. */
export function parseServings(servings: string | undefined): number | null {
  const m = servings?.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// Render scaled quantities the way a cook writes them: "1½" not "1.5",
// but fall back to a decimal when no common fraction is close.
function formatQty(v: number): string {
  const whole = Math.floor(v + 1e-9);
  const frac = v - whole;
  if (frac < 0.03 || v >= 10) return String(Math.round(v));
  const fractions: [number, string][] = [
    [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"],
  ];
  for (const [f, sym] of fractions) {
    if (Math.abs(frac - f) < 0.05) return whole ? `${whole}${sym}` : sym;
  }
  return String(Math.round(v * 10) / 10);
}

/**
 * Scales the numeric part of one amount string, keeping everything else:
 * "1 cup" ×2 → "2 cup", "250g" ×1.5 → "375g", "1-2 tbsp" ×2 → "2–4 tbsp",
 * "½" ×2 → "1". Returns null when there's no leading quantity to scale
 * ("a pinch", "to taste") — caller keeps the original.
 */
export function scaleAmount(amount: string, factor: number): string | null {
  // The trailing text must start with a letter or "(" — a loose [^\d\s]
  // matcher here once swallowed the "/2" of "1/2 tsp", scaling it to "2/2".
  const m = amount.trim().match(
    /^([\d¼½¾⅓⅔⅕⅛⅜⅝⅞./\s]+?)(?:\s*(?:-|–|—|to)\s*([\d¼½¾⅓⅔⅕⅛⅜⅝⅞./\s]+?))?(\s*)([a-zA-Z(].*)?$/
  );
  if (!m) return null;

  const [, q1raw, q2raw, gap, rest] = m;
  const q1 = parseQty(q1raw);
  if (q1 === null) return null;

  let out = formatQty(q1 * factor);
  if (q2raw) {
    const q2 = parseQty(q2raw);
    if (q2 !== null) out += `–${formatQty(q2 * factor)}`;
  }
  if (rest) out += `${gap}${rest}`;
  return out;
}

/**
 * Returns a copy of the recipe with every amount (and the servings label)
 * scaled by factor. Unscalable amounts stay as-is. Never mutates the
 * original — edit/save flows keep the source amounts, like toMetricRecipe.
 */
function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  return ingredients.map((ing) => {
    if (!ing.amount) return ing;
    const scaled = scaleAmount(ing.amount, factor);
    return scaled ? { ...ing, amount: scaled } : ing;
  });
}

export function scaleRecipe(recipe: Recipe, factor: number): Recipe {
  const base = parseServings(recipe.servings);
  return {
    ...recipe,
    servings:
      base !== null && recipe.servings
        ? recipe.servings.replace(/\d+(?:\.\d+)?/, formatQty(base * factor))
        : recipe.servings,
    ingredients: scaleIngredients(recipe.ingredients, factor),
    // A component is made in proportion to the dish it goes into, so halving
    // the recipe has to halve its filling too — otherwise the amounts stop
    // agreeing with the main list's line for that component.
    subRecipes: recipe.subRecipes?.map((sub) => ({
      ...sub,
      ingredients: scaleIngredients(sub.ingredients, factor),
    })),
  };
}

/** True if toggling to metric would change anything on this recipe. */
export function hasConvertibleAmounts(recipe: Recipe): boolean {
  const convertible = (ing: Ingredient) =>
    Boolean(ing.amount && convertAmount(ing.amount, ing.name) !== null);
  return (
    recipe.ingredients.some(convertible) ||
    (recipe.subRecipes ?? []).some((sub) => sub.ingredients.some(convertible))
  );
}

/**
 * Returns a copy of the recipe with every convertible ingredient amount in
 * grams/ml. Unconvertible amounts stay as-is, so mixed lists degrade
 * gracefully. The original recipe object is never mutated (edit/save flows
 * keep operating on the source amounts).
 */
export function toMetricRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ingredients: toMetricIngredients(recipe.ingredients),
    subRecipes: recipe.subRecipes?.map((sub) => ({
      ...sub,
      ingredients: toMetricIngredients(sub.ingredients),
    })),
  };
}

function toMetricIngredients(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.map((ing) => {
    if (!ing.amount) return ing;
    const converted = convertAmount(ing.amount, ing.name);
    return converted ? { ...ing, amount: converted } : ing;
  });
}
