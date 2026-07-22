"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { useRecentRecipes } from "@/lib/recentRecipes";
import { hapticTap } from "@/lib/nativeApp";
import { RecipeScoutRadar } from "@/components/RecipeScoutRadar";
import type { Recipe } from "@/lib/types/recipe";
import type { RecipeSearchResult } from "@/lib/ai/recipeSearch";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

interface SavedRecipe {
  id: string;
  title: string;
  recipe: Recipe;
}

type ScanState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: RecipeSearchResult[] }
  | { status: "error"; message: string };

export default function SearchPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const recent = useRecentRecipes();
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<SavedRecipe[] | null>(null);
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const [stepIndex, setStepIndex] = useState(0);

  // Cycles through "searching sites / comparing reviews / picking the
  // best" while the scan is in flight, so the radar's wait feels like it's
  // actively doing something rather than just spinning.
  useEffect(() => {
    if (scan.status !== "loading") return;
    const id = setInterval(() => setStepIndex((i) => (i + 1) % t.searchScoutSteps.length), 1400);
    return () => clearInterval(id);
  }, [scan.status, t.searchScoutSteps.length]);

  // Deep-link entry: /search?q=<query>&auto=1 — what Home's search bar
  // sends. Prefills the box and kicks off a scan immediately.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q")?.trim();
    if (!initial) return;
    window.history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => {
      setQuery(initial);
      if (params.get("auto") === "1") runScan(initial);
    });
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // A lightweight "Discover" — browses the tags AI already attached to the
  // user's own recipes (cuisine, meal type, etc.) as quick-filter chips.
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

  async function runScan(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    hapticTap();
    setStepIndex(0);
    setScan({ status: "loading" });
    try {
      const res = await fetch("/api/recipe-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, lang: language }),
      });
      const body = await res.json();
      if (body.ok) {
        setScan({ status: "done", results: body.results });
      } else {
        setScan({ status: "error", message: body.error || t.searchScanError });
      }
    } catch {
      setScan({ status: "error", message: t.searchScanError });
    }
  }

  function handleScan(e?: React.FormEvent) {
    e?.preventDefault();
    if (scan.status === "loading") return;
    runScan(query);
  }

  return (
    <main className="relative flex-1 flex flex-col items-center gap-6 px-5 py-8 pb-28 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="flex w-full max-w-2xl items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EDF3DF] text-[#4D7C0F] dark:bg-stone-800 dark:text-lime-400">
          <ScoutIcon />
        </span>
        <span className="text-[13px] font-semibold uppercase tracking-wide text-[#4D7C0F] dark:text-lime-500">
          {t.searchScoutName}
        </span>
      </div>

      <form onSubmit={handleScan} className="flex w-full max-w-2xl flex-col gap-3">
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA093]">
            <SearchGlyph />
          </span>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (scan.status !== "idle") setScan({ status: "idle" });
            }}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-full border-none bg-[#F1F4EA] dark:bg-stone-800 py-3.5 pl-11 pr-4 text-[15px] text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:ring-2 focus:ring-[#61A00E]/30"
          />
        </div>
        <p className="px-1 text-xs leading-relaxed text-[#9AA093]">{t.searchScoutTagline}</p>
        {q && scan.status !== "loading" && (
          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-br from-[#9ED13A] to-[#6FAE15] py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {t.searchScanButton}
          </button>
        )}
      </form>

      {scan.status === "loading" && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-2 py-6 animate-fade-in-up">
          <RecipeScoutRadar />
          <p className="text-sm text-[#5D6551] dark:text-stone-400">{t.searchScoutSteps[stepIndex]}</p>
        </div>
      )}

      {scan.status === "error" && (
        <p className="w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {scan.message}
        </p>
      )}

      {scan.status === "done" && (
        <section className="flex w-full max-w-2xl flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9AA093]">
            {t.searchScanSection}
          </h2>
          {scan.results.length === 0 ? (
            <p className="px-1 text-sm text-[#9AA093]">{t.searchScanEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {scan.results.map((result, i) => (
                <li key={`${result.url}-${i}`}>
                  <ScanResultCard result={result} getLabel={t.searchScanGet} badgeLabel={t.searchScanBadge} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!q && scan.status === "idle" && (
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
                    className="rounded-full border border-[#E2E6D9] dark:border-stone-600 bg-white dark:bg-stone-800 px-3.5 py-1.5 text-xs font-medium text-[#5E7A33] dark:text-stone-300 transition-colors hover:border-[#C0DC8C]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
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
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-white dark:bg-stone-800 dark:border-stone-700 px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]"
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
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-white dark:bg-stone-800 dark:border-stone-700 px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]"
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

/** One web result — Skyscanner-style card: source, quality signals, and a
 *  one-tap handoff into the normal extraction flow. */
function ScanResultCard({
  result,
  getLabel,
  badgeLabel,
}: {
  result: RecipeSearchResult;
  getLabel: string;
  badgeLabel: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border px-4 py-3.5 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none ${
        result.recommended
          ? "border-[#9ED13A] bg-[#F7FBEE] dark:border-lime-700 dark:bg-stone-800"
          : "border-transparent bg-white dark:border-stone-700 dark:bg-stone-800"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-[#232920] dark:text-stone-100">
          {result.title}
        </span>
        {result.recommended && (
          <span className="shrink-0 rounded-full bg-[#6FAE15] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {badgeLabel}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-[#5E7A33] dark:text-lime-500">
        {result.source}
        {result.highlights ? <span className="text-[#9AA093] dark:text-stone-400"> · {result.highlights}</span> : null}
      </p>
      {result.summary && (
        <p className="text-sm leading-relaxed text-[#5D6551] dark:text-stone-400">{result.summary}</p>
      )}
      {result.whyGood && (
        <p className="text-xs leading-relaxed text-[#9AA093]">
          {result.whyGood}
        </p>
      )}
      <Link
        href={`/extract?url=${encodeURIComponent(result.url)}`}
        onClick={() => hapticTap()}
        className="mt-1 self-start rounded-full bg-[#EDF3DF] px-4 py-2 text-xs font-semibold text-[#4D7C0F] transition-colors hover:bg-[#E0EBC8] dark:bg-stone-700 dark:text-lime-400 dark:hover:bg-stone-600"
      >
        {getLabel} →
      </Link>
    </div>
  );
}

function ScoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </svg>
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
