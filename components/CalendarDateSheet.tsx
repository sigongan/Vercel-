"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Recipe } from "@/lib/types/recipe";
import type { Translation } from "@/lib/i18n";
import { openAddToCalendar } from "@/lib/calendarEvent";
import { hapticTap } from "@/lib/nativeApp";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Bottom sheet asking which day to cook a recipe, then hands an .ics event
 *  off to the OS Calendar app. Shared between RecipeCard's actions sheet and
 *  the Want to cook library tab so both add events the same way. */
export function CalendarDateSheet({
  recipe,
  onClose,
  t,
}: {
  recipe: Recipe;
  onClose: () => void;
  t: Translation;
}) {
  const [value, setValue] = useState(tomorrow());

  function confirm() {
    hapticTap();
    // new Date("YYYY-MM-DD") parses as UTC midnight, which can land on the
    // previous day in negative-UTC-offset timezones — build it from local
    // parts instead so the event lands on the date the user actually picked.
    const [y, m, d] = value.split("-").map(Number);
    openAddToCalendar(recipe, new Date(y, m - 1, d));
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex w-full flex-col gap-5 rounded-t-3xl bg-[#FAFAF7] dark:bg-stone-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:mx-auto sm:w-full sm:max-w-sm sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[#232920] dark:text-stone-50">{t.calendarTitle}</h2>
            <p className="text-sm text-[#6B7261] dark:text-stone-400 line-clamp-1">{recipe.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.groceryClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EDF1E4] dark:bg-stone-800 text-[#5E7A33] dark:text-stone-300 transition-colors hover:opacity-80"
          >
            ✕
          </button>
        </div>

        <input
          type="date"
          value={value}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-[15px] text-[#30362B] dark:text-stone-100 outline-none focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10"
        />

        <button
          type="button"
          onClick={confirm}
          className="w-full rounded-full bg-[#61A00E] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          {t.calendarAdd}
        </button>
      </div>
    </div>,
    document.body,
  );
}
