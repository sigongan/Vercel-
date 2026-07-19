"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Recipe, RecipeStep } from "@/lib/types/recipe";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type Translation } from "@/lib/i18n";
import { RecipeEditForm } from "./RecipeEditForm";
import { CookMode } from "./CookMode";
import { fitPrintArea, resetPrintArea } from "@/lib/printFit";
import { hapticTap, hapticSuccess, shareText } from "@/lib/nativeApp";
import { GroceryListSheet } from "./GroceryList";
import { addRecipeToGroceryList } from "@/lib/groceryList";
import { useRecipeNote } from "@/lib/recipeNotes";
import {
  hasConvertibleAmounts,
  toMetricRecipe,
  parseServings,
  scaleRecipe,
  type UnitSystem,
} from "@/lib/units";

const UNITS_KEY = "avocato:units";
const UNITS_EVENT = "avocato:units-change";

function subscribeUnits(callback: () => void) {
  window.addEventListener(UNITS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(UNITS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readUnits(): UnitSystem {
  try {
    return localStorage.getItem(UNITS_KEY) === "metric" ? "metric" : "original";
  } catch {
    return "original";
  }
}

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface Meta {
  label: string;
  value: string;
}

interface CardProps {
  recipe: Recipe;
  steps: RecipeStep[];
  metas: Meta[];
  t: Translation;
}

export function RecipeCard({
  recipe,
  onRecipeChange,
  saveable = true,
}: {
  recipe: Recipe;
  onRecipeChange?: (recipe: Recipe) => void;
  /** Hide the Save button where the recipe is already saved (My Recipes). */
  saveable?: boolean;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [groceryOpen, setGroceryOpen] = useState(false);

  // Remember the g/ml preference across recipes and sessions — someone who
  // cooks metric always cooks metric. useSyncExternalStore over an effect:
  // lint-clean, and safe on the server-rendered recipe pages (React re-renders
  // with the client snapshot after hydration instead of mismatching).
  const units = useSyncExternalStore(subscribeUnits, readUnits, () => "original" as UnitSystem);

  function toggleUnits() {
    hapticTap();
    const next: UnitSystem = units === "metric" ? "original" : "metric";
    try {
      localStorage.setItem(UNITS_KEY, next);
    } catch {
      // Storage unavailable — preference just won't persist.
    }
    window.dispatchEvent(new Event(UNITS_EVENT));
  }

  const convertible = useMemo(() => hasConvertibleAmounts(recipe), [recipe]);

  // Serving scaler: multiply every amount by servings/baseServings. When the
  // recipe states servings ("2 servings") the stepper shows real serving
  // counts; otherwise it falls back to plain multipliers (×2, ×3...).
  const baseServings = useMemo(() => parseServings(recipe.servings), [recipe]);
  const [scaleFactor, setScaleFactor] = useState(1);
  // A newly extracted recipe starts back at its own serving count — the
  // adjust-state-during-render pattern, since an effect-based reset would
  // flash the previous recipe's scaling for one frame.
  const [prevRecipe, setPrevRecipe] = useState(recipe);
  if (prevRecipe !== recipe) {
    setPrevRecipe(recipe);
    setScaleFactor(1);
  }

  const FACTOR_STEPS = useMemo(() => {
    if (baseServings !== null && baseServings > 0) {
      // 1..24 servings expressed as factors of the base.
      return Array.from({ length: 24 }, (_, i) => (i + 1) / baseServings);
    }
    return [0.5, 1, 1.5, 2, 3, 4, 6, 8];
  }, [baseServings]);

  function stepScale(direction: 1 | -1) {
    hapticTap();
    const idx = FACTOR_STEPS.findIndex((f) => Math.abs(f - scaleFactor) < 1e-6);
    const next = FACTOR_STEPS[Math.min(Math.max((idx === -1 ? FACTOR_STEPS.indexOf(1) : idx) + direction, 0), FACTOR_STEPS.length - 1)];
    setScaleFactor(next);
  }

  const scaleLabel =
    baseServings !== null && baseServings > 0
      ? String(Math.round(baseServings * scaleFactor))
      : `×${scaleFactor}`;

  // What every view (themes, cook mode, copy/share text) renders. Editing
  // and saving keep operating on the untouched source recipe. Scale first,
  // then convert units, so "3 tbsp ×2" becomes 6 tbsp → 85g, not 43g×2.
  const displayRecipe = useMemo(() => {
    let r = recipe;
    if (scaleFactor !== 1) r = scaleRecipe(r, scaleFactor);
    if (units === "metric" && convertible) r = toMetricRecipe(r);
    return r;
  }, [recipe, units, convertible, scaleFactor]);

  const steps = useMemo(() => [...recipe.steps].sort((a, b) => a.order - b.order), [recipe.steps]);

  useEffect(() => {
    window.addEventListener("beforeprint", fitPrintArea);
    window.addEventListener("afterprint", resetPrintArea);
    return () => {
      window.removeEventListener("beforeprint", fitPrintArea);
      window.removeEventListener("afterprint", resetPrintArea);
    };
  }, []);

  const metas: Meta[] = [];
  if (displayRecipe.servings) metas.push({ label: t.serves, value: displayRecipe.servings });
  if (recipe.prepTime) metas.push({ label: t.prep, value: recipe.prepTime });
  if (recipe.cookTime) metas.push({ label: t.cook, value: recipe.cookTime });

  function recipeAsText(): string {
    return [
      displayRecipe.title,
      displayRecipe.description ?? "",
      "",
      `${t.ingredients}:`,
      ...displayRecipe.ingredients.map((i) => `- ${i.name}${i.amount ? ` — ${formatAmount(i)}` : ""}`),
      "",
      `${t.steps}:`,
      ...steps.map((s) => `${s.order}. ${s.instruction}`),
    ].join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recipeAsText());
      setCopied(true);
      hapticSuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  async function handleShare() {
    hapticTap();
    const outcome = await shareText(recipe.title, recipeAsText());
    if (outcome === "copied") {
      // No share sheet on this platform — the text landed on the clipboard
      // instead, so show the Copy button's confirmation.
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="print-area flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {convertible && !editing && (
            <button
              onClick={toggleUnits}
              title={t.unitsToggleTitle}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                units === "metric"
                  ? "bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white shadow-sm"
                  : "border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-900 text-[#6B7261] hover:text-[#232920] dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              {t.unitsToggle}
            </button>
          )}
          {!editing && recipe.ingredients.some((i) => i.amount) && (
            <div className="flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-900">
              <button
                onClick={() => stepScale(-1)}
                aria-label={t.scaleDown}
                className="px-3 py-1.5 text-sm font-semibold text-[#6B7261] hover:text-[#232920] dark:text-stone-400 dark:hover:text-stone-200 disabled:opacity-30"
                disabled={Math.abs(scaleFactor - FACTOR_STEPS[0]) < 1e-6}
              >
                −
              </button>
              <span
                title={t.scaleTitle}
                className={`min-w-8 text-center text-xs font-semibold tabular-nums ${scaleFactor !== 1 ? "text-[#4D7C0F] dark:text-stone-100" : "text-[#6B7261] dark:text-stone-400"}`}
              >
                {scaleLabel}
              </span>
              <button
                onClick={() => stepScale(1)}
                aria-label={t.scaleUp}
                className="px-3 py-1.5 text-sm font-semibold text-[#6B7261] hover:text-[#232920] dark:text-stone-400 dark:hover:text-stone-200 disabled:opacity-30"
                disabled={Math.abs(scaleFactor - FACTOR_STEPS[FACTOR_STEPS.length - 1]) < 1e-6}
              >
                +
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing && steps.length > 0 && (
            <button
              onClick={() => {
                hapticTap();
                setCookModeOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <CookIcon />
              {t.cookMode}
            </button>
          )}
          {!editing && saveable && SUPABASE_CONFIGURED && <SaveButton recipe={recipe} t={t} />}
          <button
            onClick={() => {
              hapticTap();
              setEditing((e) => !e);
            }}
            className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
          >
            <EditIcon />
            {editing ? t.editCancel : t.edit}
          </button>
          {!editing && displayRecipe.ingredients.length > 0 && (
            <button
              onClick={() => {
                hapticSuccess();
                addRecipeToGroceryList(displayRecipe);
                setGroceryOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
            >
              <CartIcon />
              {t.groceryAdd}
            </button>
          )}
          {!editing && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
            >
              <ShareIcon />
              {t.share}
            </button>
          )}
          {!editing && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
            >
              <CopyIcon />
              {copied ? t.copied : t.copy}
            </button>
          )}
          {!editing && (
            <button
              onClick={() => {
                hapticTap();
                window.print();
              }}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
            >
              <PrintIcon />
              {t.print}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <RecipeEditForm
          recipe={recipe}
          t={t}
          onCancel={() => setEditing(false)}
          onSave={(updated) => {
            onRecipeChange?.(updated);
            setEditing(false);
          }}
        />
      ) : (
        <ClassicCard recipe={displayRecipe} steps={steps} metas={metas} t={t} />
      )}

      {!editing && <RecipeNotes title={recipe.title} t={t} />}

      {cookModeOpen && (
        <CookMode recipe={displayRecipe} steps={steps} t={t} onClose={() => setCookModeOpen(false)} />
      )}
      {groceryOpen && (
        <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} t={t} />
      )}
    </div>
  );
}

/* ---------- Classic: clean two-column cookbook layout ---------- */

function ClassicCard({ recipe, steps, metas, t }: CardProps) {
  return (
    <article className="rounded-[32px] border border-transparent dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-10 shadow-[0_10px_34px_rgba(105,150,55,0.14)] dark:shadow-sm flex flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#4D7C0F] dark:text-orange-400">
            {t.recipe}
          </p>
          {recipe.confidence && (
            <span className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-[#F1F4EA] dark:bg-stone-800 text-[#5D6551] dark:text-stone-400">
              {t.confidence[recipe.confidence]}
            </span>
          )}
        </div>
        <h2 className="font-display italic text-2xl sm:text-4xl font-semibold tracking-tight text-[#30362B] dark:text-stone-50">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="text-[#5D6551] dark:text-stone-400 leading-relaxed">{recipe.description}</p>
        )}
        {metas.length > 0 && (
          <dl className="mt-3 flex divide-x divide-[#EDF1E4] dark:divide-stone-800 border-y border-[#EDF1E4] dark:border-stone-800">
            {metas.map((m) => (
              <div key={m.label} className="flex-1 px-3 py-2.5 first:pl-0 sm:px-5 sm:py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4D7C0F]">
                  {m.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#232920] dark:text-stone-200">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <NutritionRow recipe={recipe} t={t} />
      </header>

      <div className="grid gap-8 sm:gap-10 sm:grid-cols-[minmax(220px,260px)_1fr]">
        {recipe.ingredients.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4D7C0F]">
              {t.ingredients}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-1.5 text-[15px]">
                  <span className="text-[#30362B] dark:text-stone-200">{ing.name}</span>
                  {ing.amount && (
                    <>
                      <span className="flex-1 border-b border-dotted border-[#E2E6D9] dark:border-stone-700" />
                      <span
                        title={ing.estimated ? t.estimatedShort : undefined}
                        className={`shrink-0 whitespace-nowrap text-sm tabular-nums ${
                          ing.estimated
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-[#6B7261] dark:text-stone-400"
                        }`}
                      >
                        {formatAmount(ing)}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {hasEstimates(recipe) && <EstimatedLegend t={t} />}
          </section>
        )}

        {steps.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4D7C0F]">{t.steps}</h3>
            <ol className="flex flex-col gap-4">
              {steps.map((step) => (
                <li key={step.order} className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] dark:bg-stone-100 text-[11px] font-semibold text-white dark:text-stone-900">
                    {step.order}
                  </span>
                  <p className="text-[15px] leading-relaxed text-[#30362B] dark:text-stone-300">
                    {step.instruction}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <CardFooter recipe={recipe} t={t} />
    </article>
  );
}

function SaveButton({ recipe, t }: { recipe: Recipe; t: Translation }) {
  const [plan, setPlan] = useState<string | null | undefined>(undefined); // undefined = loading, null = signed out
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setPlan(body.signedIn ? (body.plan ?? "free") : null))
      .catch(() => setPlan(null));
  }, []);

  if (plan === undefined) return null;

  if (plan === null) {
    return (
      <button
        onClick={() => window.dispatchEvent(new Event("avocato:open-signin"))}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
      >
        <BookmarkIcon />
        {t.signInToSave}
      </button>
    );
  }

  if (plan !== "pro") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            setSubscribeError(null);
            try {
              const res = await fetch("/api/stripe/subscribe", { method: "POST" });
              const data = await res.json();
              if (data.url) {
                window.location.href = data.url;
              } else {
                setSubscribeError(data.error || t.subscribeUnavailable);
              }
            } catch {
              setSubscribeError(t.subscribeUnavailable);
            }
          }}
          className="flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 shadow-sm transition-colors hover:border-amber-500"
        >
          <BookmarkIcon />
          {t.saveRequiresPro}
        </button>
        {subscribeError && <span className="text-xs text-red-600 dark:text-red-400">{subscribeError}</span>}
      </div>
    );
  }

  async function handleSave() {
    setState("saving");
    hapticTap();
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
      setState(res.ok ? "saved" : "error");
      if (res.ok) hapticSuccess();
    } catch {
      setState("error");
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={state === "saving" || state === "saved"}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:cursor-default ${
        state === "saved"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
          : "bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 disabled:opacity-70"
      }`}
    >
      {state === "saved" ? <CheckIcon /> : <BookmarkIcon />}
      {state === "saving" ? t.saving : state === "saved" ? t.saved : t.save}
    </button>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CookIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

/* ---------- shared bits ---------- */

function CardFooter({ recipe, t }: { recipe: Recipe; t: Translation }) {
  if (recipe.tags.length === 0 && !recipe.notes && !recipe.sourceUrl) return null;

  return (
    <footer className="flex flex-col gap-4 border-t border-stone-200 dark:border-stone-800 pt-6">
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs rounded-full border border-stone-200 dark:border-stone-700 px-3 py-1 text-stone-500 dark:text-stone-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {recipe.notes && (
        <p className="rounded-lg bg-stone-100/70 dark:bg-stone-800/60 px-4 py-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400 whitespace-pre-line">
          <span className="font-semibold text-stone-600 dark:text-stone-300">{t.notes} — </span>
          {recipe.notes}
        </p>
      )}
      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600 dark:hover:text-stone-300 self-start"
        >
          {t.viewOriginal}
        </a>
      )}
    </footer>
  );
}

function EditIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v13" />
      <polyline points="7 8 12 3 17 8" />
      <path d="M20 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

/**
 * Personal on-device notes under the recipe card. Autosaves as you type;
 * reopening the same recipe (even from history) brings the note back.
 */
function RecipeNotes({ title, t }: { title: string; t: Translation }) {
  const [note, setNote] = useRecipeNote(title);

  return (
    <section className="print:hidden flex flex-col gap-2 rounded-3xl border border-[#E2E6D9] dark:border-stone-800 bg-[#FCFCF9] dark:bg-stone-900 p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4D7C0F]">
        {t.myNotesTitle}
      </h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.myNotesPlaceholder}
        rows={note ? Math.min(Math.max(note.split("\n").length, 2), 8) : 2}
        className="w-full resize-y rounded-xl border border-transparent bg-transparent text-sm leading-relaxed text-[#30362B] dark:text-stone-200 placeholder-[#9AA093] dark:placeholder-stone-600 outline-none focus:border-[#E2E6D9] dark:focus:border-stone-700"
      />
    </section>
  );
}

/**
 * AI-estimated per-serving nutrition. Renders nothing when the recipe has
 * no estimate (older cached extractions, unclear sources). Per-serving
 * values intentionally ignore the serving scaler.
 */
function NutritionRow({ recipe, t }: { recipe: Recipe; t: Translation }) {
  const n = recipe.nutrition;
  if (!n) return null;
  const items: { label: string; value: string }[] = [];
  if (n.calories) items.push({ label: t.nutritionCalories, value: n.calories });
  if (n.protein) items.push({ label: t.nutritionProtein, value: n.protein });
  if (n.carbs) items.push({ label: t.nutritionCarbs, value: n.carbs });
  if (n.fat) items.push({ label: t.nutritionFat, value: n.fat });
  if (items.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <span
            key={i.label}
            className="flex items-baseline gap-1.5 rounded-full bg-[#EFF4E5] dark:bg-stone-800 px-3 py-1.5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4D7C0F]">
              {i.label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#232920] dark:text-stone-200">
              {i.value}
            </span>
          </span>
        ))}
      </div>
      <p className="text-[10px] text-[#9AA093] dark:text-stone-500">{t.nutritionTitle}</p>
    </div>
  );
}

function formatAmount(ing: { amount?: string; estimated?: boolean }): string {
  if (!ing.amount) return "";
  return ing.estimated ? `~${ing.amount}` : ing.amount;
}

function hasEstimates(recipe: Recipe): boolean {
  return recipe.ingredients.some((i) => i.estimated);
}

function EstimatedLegend({ t, className = "" }: { t: Translation; className?: string }) {
  return (
    <p className={`text-[11px] italic text-stone-400 dark:text-stone-500 ${className}`}>
      {t.estimatedLegend}
    </p>
  );
}
