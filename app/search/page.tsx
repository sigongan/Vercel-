"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { useRecentRecipes } from "@/lib/recentRecipes";
import type { Recipe } from "@/lib/types/recipe";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

interface SavedRecipe {
  id: string;
  title: string;
  recipe: Recipe;
}

export default function SearchPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const recent = useRecentRecipes();
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<SavedRecipe[] | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    fetch("/api/recipes", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (body.plan === "pro") setSaved(body.recipes ?? []);
      })
      .catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();
  const matchedRecent = q ? recent.filter((r) => r.recipe.title.toLowerCase().includes(q)) : [];
  const matchedSaved = q && saved ? saved.filter((r) => r.title.toLowerCase().includes(q)) : [];
  const hasResults = matchedRecent.length > 0 || matchedSaved.length > 0;

  return (
    <main className="relative flex-1 flex flex-col items-center gap-5 px-5 py-8 pb-28 bg-gradient-to-b from-[#FAFAF7] via-[#F4F6EE] to-[#FAFAF7] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div className="flex w-full max-w-2xl flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[#232920] dark:text-stone-50">{t.searchTitle}</h1>
      </div>

      <div className="w-full max-w-2xl">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10"
        />
      </div>

      {!q && (
        <p className="w-full max-w-2xl px-1 text-sm text-[#9AA093]">{t.searchEmptyPrompt}</p>
      )}

      {q && !hasResults && (
        <p className="w-full max-w-2xl px-1 text-sm text-[#9AA093]">{t.searchNoResults}</p>
      )}

      {matchedRecent.length > 0 && (
        <section className="flex w-full max-w-2xl flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9AA093]">
            {t.searchRecentSection}
          </h2>
          <ul className="flex flex-col gap-2">
            {matchedRecent.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/extract?recent=${item.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-white dark:bg-stone-900 dark:border-stone-800 px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#30362B] dark:text-stone-200">
                    {item.recipe.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {matchedSaved.length > 0 && (
        <section className="flex w-full max-w-2xl flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9AA093]">
            {t.searchSavedSection}
          </h2>
          <ul className="flex flex-col gap-2">
            {matchedSaved.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/recipes/${item.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-white dark:bg-stone-900 dark:border-stone-800 px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#30362B] dark:text-stone-200">
                    {item.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
