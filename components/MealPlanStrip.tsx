"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Translation } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

interface MealPlanEntry {
  planDate: string;
  savedRecipeId: string;
  title: string;
}

interface PlanRecipe {
  id: string;
  title: string;
}

/** Pro-only "this week" strip: assigns a saved recipe to each of the next 7
 *  days. Lives in the Saved tab, right above the recipe grid it picks from. */
export function MealPlanStrip({ recipes, t }: { recipes: PlanRecipe[]; t: Translation }) {
  const [dates, setDates] = useState<string[] | null>(null);
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meal-plan", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (Array.isArray(body.dates)) setDates(body.dates);
        if (Array.isArray(body.entries)) setEntries(body.entries);
      })
      .catch(() => setDates([]));
  }, []);

  async function assign(planDate: string, savedRecipeId: string) {
    hapticTap();
    const recipe = recipes.find((r) => r.id === savedRecipeId);
    setEntries((prev) => [
      ...prev.filter((e) => e.planDate !== planDate),
      { planDate, savedRecipeId, title: recipe?.title ?? "" },
    ]);
    setPickerDate(null);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDate, savedRecipeId }),
    });
  }

  async function remove(planDate: string) {
    hapticTap();
    setEntries((prev) => prev.filter((e) => e.planDate !== planDate));
    await fetch(`/api/meal-plan?date=${planDate}`, { method: "DELETE" });
  }

  if (!dates || dates.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
      <p className="text-sm font-semibold text-[#232920] dark:text-stone-100">{t.mealPlanTitle}</p>
      <div className="grid grid-cols-7 gap-1.5">
        {dates.map((date) => {
          const entry = entries.find((e) => e.planDate === date);
          const d = new Date(`${date}T00:00:00`);
          const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#9AA093]">{dayLabel}</span>
              <span className="text-[11px] font-medium text-[#5D6551] dark:text-stone-400">{d.getDate()}</span>
              {entry ? (
                <button
                  type="button"
                  onClick={() => remove(date)}
                  aria-label={t.mealPlanRemove}
                  title={entry.title}
                  className="line-clamp-2 flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#8BC926] to-[#61A00E] px-1 text-center text-[9px] font-medium leading-tight text-white"
                >
                  {entry.title}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    hapticTap();
                    setPickerDate(date);
                  }}
                  className="flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-[#E2E6D9] dark:border-stone-600 text-[#CDD4C2] transition-colors hover:border-[#8BC926] hover:text-[#8BC926]"
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pickerDate && (
        <RecipePickerSheet
          recipes={recipes}
          t={t}
          onPick={(id) => assign(pickerDate, id)}
          onClose={() => setPickerDate(null)}
        />
      )}
    </div>
  );
}

function RecipePickerSheet({
  recipes,
  t,
  onPick,
  onClose,
}: {
  recipes: PlanRecipe[];
  t: Translation;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full flex-col gap-4 rounded-t-3xl bg-[#FAFAF7] dark:bg-stone-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:mx-auto sm:w-full sm:max-w-sm sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#232920] dark:text-stone-50">{t.mealPlanPickerTitle}</h2>
          <button
            onClick={onClose}
            aria-label={t.groceryClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EDF1E4] dark:bg-stone-800 text-[#5E7A33] dark:text-stone-300 transition-colors hover:opacity-80"
          >
            ✕
          </button>
        </div>

        {recipes.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#9AA093]">{t.mealPlanNoRecipes}</p>
        ) : (
          <ul className="flex flex-col gap-1 overflow-y-auto">
            {recipes.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r.id)}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-[#30362B] dark:text-stone-200 transition-colors hover:bg-[#F1F4EA] dark:hover:bg-stone-800"
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
