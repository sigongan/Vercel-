"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { useRecentRecipes } from "@/lib/recentRecipes";
import { hapticTap } from "@/lib/nativeApp";
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

  // A lightweight "Discover" — since there's no outside content to browse,
  // this browses the tags AI already attached to the user's own recipes
  // (cuisine, meal type, etc.) as quick-filter chips instead.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const allRecipes = [...recent.map((r) => r.recipe), ...(saved ?? []).map((r) => r.recipe)];
    for (const r of allRecipes) {
      for (const tag of r.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag);
  }, [recent, saved]);

  return (
    <main className="relative flex-1 flex flex-col items-center gap-6 px-5 py-8 pb-28 bg-[#FAFAF7] dark:bg-stone-950">
      <div className="relative w-full max-w-2xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA093]">
          <SearchGlyph />
        </span>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-full border-none bg-[#F1F4EA] dark:bg-stone-900 py-3.5 pl-11 pr-4 text-[15px] text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:ring-2 focus:ring-[#61A00E]/30"
        />
      </div>

      {!q && (
        <>
          <p className="w-full max-w-2xl px-1 text-sm text-[#9AA093]">{t.searchEmptyPrompt}</p>
          {tagCounts.length > 0 && (
            <section className="flex w-full max-w-2xl flex-col gap-2.5">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9AA093]">
                {t.searchBrowseTags}
              </h2>
              <div className="flex flex-wrap gap-2">
                {tagCounts.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setQuery(tag);
                    }}
                    className="rounded-full border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-[#5E7A33] dark:text-stone-300 transition-colors hover:border-[#C0DC8C]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
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

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
