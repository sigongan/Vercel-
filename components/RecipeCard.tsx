"use client";

import { useMemo, useState } from "react";
import type { Recipe, RecipeStep } from "@/lib/types/recipe";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type Translation } from "@/lib/i18n";

type Theme = "classic" | "magazine" | "dining";

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

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { language } = useLanguage();
  const t = translations[language];
  const [theme, setTheme] = useState<Theme>("classic");
  const [copied, setCopied] = useState(false);

  const steps = useMemo(() => [...recipe.steps].sort((a, b) => a.order - b.order), [recipe.steps]);

  const metas: Meta[] = [];
  if (recipe.servings) metas.push({ label: t.serves, value: recipe.servings });
  if (recipe.prepTime) metas.push({ label: t.prep, value: recipe.prepTime });
  if (recipe.cookTime) metas.push({ label: t.cook, value: recipe.cookTime });

  async function handleCopy() {
    const lines = [
      recipe.title,
      recipe.description ?? "",
      "",
      `${t.ingredients}:`,
      ...recipe.ingredients.map((i) => `- ${i.name}${i.amount ? ` — ${i.amount}` : ""}`),
      "",
      `${t.steps}:`,
      ...steps.map((s) => `${s.order}. ${s.instruction}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  const themes: { id: Theme; label: string; premium: boolean }[] = [
    { id: "classic", label: t.themeClassic, premium: false },
    { id: "magazine", label: t.themeMagazine, premium: true },
    { id: "dining", label: t.themeDining, premium: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            {t.styleLabel}
          </span>
          <div className="flex rounded-full border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 p-1">
            {themes.map(({ id, label, premium }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  theme === id
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                    : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                }`}
              >
                {label}
                {premium && <span className="text-amber-500 text-[10px] leading-none">★</span>}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
        >
          <CopyIcon />
          {copied ? t.copied : t.copy}
        </button>
      </div>

      {theme === "classic" && <ClassicCard recipe={recipe} steps={steps} metas={metas} t={t} />}
      {theme === "magazine" && <MagazineCard recipe={recipe} steps={steps} metas={metas} t={t} />}
      {theme === "dining" && <DiningCard recipe={recipe} steps={steps} metas={metas} t={t} />}
    </div>
  );
}

/* ---------- Classic: clean two-column cookbook layout ---------- */

function ClassicCard({ recipe, steps, metas, t }: CardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 sm:p-10 shadow-sm flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-orange-700 dark:text-orange-400">
            {t.recipe}
          </p>
          {recipe.confidence && (
            <span className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
              {t.confidence[recipe.confidence]}
            </span>
          )}
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed">{recipe.description}</p>
        )}
        {metas.length > 0 && (
          <dl className="mt-3 flex divide-x divide-stone-200 dark:divide-stone-800 border-y border-stone-200 dark:border-stone-800">
            {metas.map((m) => (
              <div key={m.label} className="flex-1 px-5 py-3 first:pl-0">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {m.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-200">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <div className="grid gap-10 sm:grid-cols-[minmax(220px,260px)_1fr]">
        {recipe.ingredients.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              {t.ingredients}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-1.5 text-[15px]">
                  <span className="text-stone-800 dark:text-stone-200">{ing.name}</span>
                  {ing.amount && (
                    <>
                      <span className="flex-1 border-b border-dotted border-stone-300 dark:border-stone-700" />
                      <span className="text-stone-500 dark:text-stone-400 text-sm tabular-nums">
                        {ing.amount}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {steps.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">{t.steps}</h3>
            <ol className="flex flex-col gap-4">
              {steps.map((step) => (
                <li key={step.order} className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-[11px] font-semibold text-stone-50 dark:text-stone-900">
                    {step.order}
                  </span>
                  <p className="text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                    {step.instruction}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <CardFooter recipe={recipe} t={t} variant="classic" />
    </article>
  );
}

/* ---------- Magazine: editorial print-inspired layout ---------- */

function MagazineCard({ recipe, steps, metas, t }: CardProps) {
  return (
    <article className="rounded-2xl border border-[#e8e0d2] dark:border-[#2e261d] bg-[#faf6ef] dark:bg-[#181310] p-8 sm:p-12 flex flex-col gap-9">
      <header className="flex flex-col items-center gap-5 text-center">
        <div className="w-full border-t-2 border-b border-stone-800 dark:border-stone-400 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-stone-700 dark:text-stone-300">
            {t.recipe}
          </p>
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.08] text-stone-900 dark:text-stone-100 max-w-xl">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="font-display italic text-lg text-stone-600 dark:text-stone-400 max-w-lg leading-relaxed">
            {recipe.description}
          </p>
        )}
        {metas.length > 0 && (
          <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
            {metas.map((m) => `${m.label} ${m.value}`).join("    ·    ")}
          </p>
        )}
      </header>

      {recipe.ingredients.length > 0 && (
        <section className="flex flex-col gap-5 border-t border-stone-300 dark:border-stone-700 pt-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-800 dark:text-stone-200">
            {t.ingredients}
          </h3>
          <ul className="grid gap-x-12 gap-y-2.5 sm:grid-cols-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-[15px] leading-relaxed text-stone-800 dark:text-stone-300">
                {ing.amount && <span className="font-semibold">{ing.amount} </span>}
                {ing.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-stone-300 dark:border-stone-700 pt-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-800 dark:text-stone-200">
            {t.steps}
          </h3>
          <ol className="flex flex-col gap-7">
            {steps.map((step) => (
              <li key={step.order} className="flex gap-6">
                <span className="font-display text-5xl leading-none text-stone-300 dark:text-stone-600 select-none">
                  {String(step.order).padStart(2, "0")}
                </span>
                <p className="pt-2 text-[15px] leading-relaxed text-stone-800 dark:text-stone-300">
                  {step.instruction}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <CardFooter recipe={recipe} t={t} variant="magazine" />

      <div className="w-full border-t border-b-2 border-stone-800 dark:border-stone-400 py-1" aria-hidden />
    </article>
  );
}

/* ---------- Fine Dining: dark, gold-accented tasting-menu layout ---------- */

function DiningCard({ recipe, steps, metas, t }: CardProps) {
  return (
    <article className="rounded-2xl border border-amber-500/20 bg-stone-950 p-8 sm:p-12 text-stone-200 flex flex-col gap-9">
      <header className="flex flex-col items-center gap-4 text-center">
        <GoldDivider />
        <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-amber-500/90">
          {t.recipe}
        </p>
        <h2 className="font-display italic text-4xl sm:text-5xl leading-tight text-stone-50 max-w-xl">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="text-sm text-stone-400 max-w-md leading-relaxed">{recipe.description}</p>
        )}
        {metas.length > 0 && (
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200/70">
            {metas.map((m) => `${m.label} ${m.value}`).join("  ·  ")}
          </p>
        )}
        <GoldDivider />
      </header>

      {recipe.ingredients.length > 0 && (
        <section className="flex flex-col gap-5">
          <h3 className="text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-500/80">
            {t.ingredients}
          </h3>
          <ul className="mx-auto w-full max-w-md flex flex-col gap-2.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-3 text-sm">
                <span className="text-stone-200">{ing.name}</span>
                {ing.amount && (
                  <>
                    <span className="flex-1 border-b border-dotted border-stone-700" />
                    <span className="text-amber-300/90 tabular-nums">{ing.amount}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className="flex flex-col gap-5">
          <h3 className="text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-500/80">
            {t.steps}
          </h3>
          <ol className="mx-auto w-full max-w-lg flex flex-col gap-4">
            {steps.map((step) => (
              <li key={step.order} className="flex gap-4 text-sm leading-relaxed">
                <span className="font-display w-9 shrink-0 text-right text-amber-500">
                  {toRoman(step.order)}.
                </span>
                <p className="text-stone-300">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(recipe.tags.length > 0 || recipe.notes || recipe.sourceUrl) && (
        <footer className="flex flex-col items-center gap-4 pt-2">
          <GoldDivider />
          {recipe.tags.length > 0 && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">
              {recipe.tags.join("  ·  ")}
            </p>
          )}
          {recipe.notes && (
            <p className="max-w-md text-center text-xs leading-relaxed text-stone-500 whitespace-pre-line">
              {recipe.notes}
            </p>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] uppercase tracking-[0.2em] text-amber-500/70 underline underline-offset-4 hover:text-amber-400"
            >
              {t.viewOriginal}
            </a>
          )}
        </footer>
      )}
    </article>
  );
}

/* ---------- shared bits ---------- */

function CardFooter({
  recipe,
  t,
  variant,
}: {
  recipe: Recipe;
  t: Translation;
  variant: "classic" | "magazine";
}) {
  if (recipe.tags.length === 0 && !recipe.notes && !recipe.sourceUrl) return null;

  const border =
    variant === "classic"
      ? "border-stone-200 dark:border-stone-800"
      : "border-stone-300 dark:border-stone-700";

  return (
    <footer className={`flex flex-col gap-4 border-t ${border} pt-6`}>
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

function GoldDivider() {
  return (
    <div className="flex w-full max-w-xs items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/40" />
      <span className="text-[10px] text-amber-500">◆</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/40" />
    </div>
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

function toRoman(n: number): string {
  const map: [number, string][] = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  let x = n;
  for (const [value, numeral] of map) {
    while (x >= value) {
      result += numeral;
      x -= value;
    }
  }
  return result || String(n);
}
