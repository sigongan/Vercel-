"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type Translation } from "@/lib/i18n";
import { RecipeCard } from "@/components/RecipeCard";
import { useRecentRecipes, removeRecentRecipe } from "@/lib/recentRecipes";
import { useWantToCook, removeWantToCook, type WantToCookItem } from "@/lib/wantToCook";
import { CalendarDateSheet } from "@/components/CalendarDateSheet";
import { MealPlanStrip } from "@/components/MealPlanStrip";
import { hapticTap } from "@/lib/nativeApp";
import { startProSubscription } from "@/lib/subscribePro";
import type { Recipe } from "@/lib/types/recipe";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

interface SavedRecipe {
  id: string;
  title: string;
  recipe: Recipe;
  collection: string | null;
  created_at: string;
}

const UNCATEGORIZED = "Uncategorized";
type Plan = "loading" | "signed-out" | "free" | "pro" | "error";
type LibraryTab = "recent" | "wantToCook" | "saved";

export default function LibraryPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const [libTab, setLibTab] = useState<LibraryTab>("recent");
  const [query, setQuery] = useState("");

  const recent = useRecentRecipes();
  const filtered = query.trim()
    ? recent.filter((item) => item.recipe.title.toLowerCase().includes(query.trim().toLowerCase()))
    : recent;

  return (
    <main className="relative flex-1 flex flex-col items-center gap-6 px-5 py-10 pb-28 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="flex w-full max-w-2xl flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[#232920] dark:text-stone-50">{t.libraryTitle}</h1>
      </div>

      <div
        className={`grid w-full max-w-2xl gap-1 rounded-full bg-[#F1F4EA] dark:bg-stone-700 p-1 ${
          SUPABASE_CONFIGURED ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            hapticTap();
            setLibTab("recent");
          }}
          className={`rounded-full py-2.5 text-sm font-semibold transition-colors ${
            libTab === "recent"
              ? "bg-white dark:bg-stone-800 text-[#4D7C0F] dark:text-stone-100 shadow-[0_2px_8px_rgba(110,150,60,0.15)]"
              : "text-[#6B7261] hover:text-[#232920] dark:hover:text-stone-300"
          }`}
        >
          {t.libraryRecentTab}
        </button>
        <button
          type="button"
          onClick={() => {
            hapticTap();
            setLibTab("wantToCook");
          }}
          className={`rounded-full py-2.5 text-sm font-semibold transition-colors ${
            libTab === "wantToCook"
              ? "bg-white dark:bg-stone-800 text-[#4D7C0F] dark:text-stone-100 shadow-[0_2px_8px_rgba(110,150,60,0.15)]"
              : "text-[#6B7261] hover:text-[#232920] dark:hover:text-stone-300"
          }`}
        >
          {t.libraryWantToCookTab}
        </button>
        {SUPABASE_CONFIGURED && (
          <button
            type="button"
            onClick={() => {
              hapticTap();
              setLibTab("saved");
            }}
            className={`rounded-full py-2.5 text-sm font-semibold transition-colors ${
              libTab === "saved"
                ? "bg-white dark:bg-stone-800 text-[#4D7C0F] dark:text-stone-100 shadow-[0_2px_8px_rgba(110,150,60,0.15)]"
                : "text-[#6B7261] hover:text-[#232920] dark:hover:text-stone-300"
            }`}
          >
            {t.librarySavedTab}
          </button>
        )}
      </div>

      {libTab === "recent" && (
        <div className="flex w-full max-w-2xl flex-col gap-3">
          {recent.length > 5 && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.recentSearch}
              className="w-full rounded-xl border border-[#E2E6D9] dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10"
            />
          )}

          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-700 bg-white/60 dark:bg-stone-800/40 px-5 py-14 text-center text-sm text-[#9AA093]">
              {t.libraryEmptyRecent}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-3 rounded-2xl border border-transparent bg-white dark:bg-stone-800 dark:border-stone-700 px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]">
                    <Link
                      href={`/extract?recent=${item.id}`}
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5"
                    >
                      <span className="w-full truncate text-sm font-medium text-[#30362B] dark:text-stone-200">
                        {item.recipe.title}
                      </span>
                      <span className="text-xs text-[#9AA093]">{timeAgo(item.savedAt, language)}</span>
                    </Link>
                    <button
                      type="button"
                      aria-label={t.recentRemove}
                      onClick={() => removeRecentRecipe(item.id)}
                      className="shrink-0 text-[#9AA093] transition-colors hover:text-[#232920] dark:hover:text-stone-200"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {libTab === "wantToCook" && <WantToCookSection t={t} />}

      {libTab === "saved" && SUPABASE_CONFIGURED && <SavedRecipesSection t={t} />}
    </main>
  );
}

function WantToCookSection({ t }: { t: Translation }) {
  const items = useWantToCook();
  const [openId, setOpenId] = useState<string | null>(null);
  const [calendarFor, setCalendarFor] = useState<WantToCookItem | null>(null);

  if (items.length === 0) {
    return (
      <p className="w-full max-w-2xl rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-700 bg-white/60 dark:bg-stone-800/40 px-5 py-14 text-center text-sm text-[#9AA093]">
        {t.libraryEmptyWantToCook}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-transparent bg-white dark:bg-stone-800 dark:border-stone-700 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
              >
                <span className="w-full truncate text-sm font-medium text-[#30362B] dark:text-stone-200">
                  {item.recipe.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  setCalendarFor(item);
                }}
                aria-label={t.calendarAdd}
                className="shrink-0 text-[#9AA093] transition-colors hover:text-[#4D7C0F] dark:hover:text-lime-500"
              >
                <CalendarIcon />
              </button>
              <button
                type="button"
                aria-label={t.recentRemove}
                onClick={() => removeWantToCook(item.id)}
                className="shrink-0 text-[#9AA093] transition-colors hover:text-[#232920] dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>
            {openId === item.id && (
              <div className="border-t border-[#E2E6D9] dark:border-stone-700 px-4 pb-4 pt-4">
                <RecipeCard recipe={item.recipe} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {calendarFor && (
        <CalendarDateSheet recipe={calendarFor.recipe} onClose={() => setCalendarFor(null)} t={t} />
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SavedRecipesSection({ t }: { t: Translation }) {
  const [plan, setPlan] = useState<Plan>("loading");
  const [recipes, setRecipes] = useState<SavedRecipe[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recipes", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || body.error) {
          console.error("GET /api/recipes failed", body.error);
          setPlan("error");
          return;
        }
        if (!body.signedIn) {
          setPlan("signed-out");
          return;
        }
        setPlan(body.plan);
        if (body.plan === "pro") setRecipes(body.recipes ?? []);
      })
      .catch(() => setPlan("error"));
  }, []);

  async function handleDelete(id: string) {
    setRecipes((prev) => prev?.filter((r) => r.id !== id) ?? null);
    if (openId === id) setOpenId(null);
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
  }

  async function handleSetCollection(id: string, collection: string) {
    const value = collection.trim() || null;
    setRecipes((prev) => prev?.map((r) => (r.id === id ? { ...r, collection: value } : r)) ?? null);
    setEditingCollectionId(null);
    await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: value }),
    });
  }

  async function handleSubscribe() {
    setBillingError(null);
    const outcome = await startProSubscription();
    if (outcome === "success") {
      window.location.reload();
    } else if (outcome === "pending") {
      setBillingError(t.subscribePending);
    } else if (outcome === "error" || outcome === "unavailable") {
      setBillingError(t.subscribeUnavailable);
    }
    // "redirecting" (Stripe) and "cancelled" (user backed out) need no action.
  }

  async function handleManage() {
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setBillingError(data.error || t.subscribeUnavailable);
    } catch {
      setBillingError(t.subscribeUnavailable);
    }
  }

  if (plan === "loading") return <RecipesSkeleton />;

  if (plan === "error") {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-dashed border-red-300 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20 px-8 py-14 text-center">
        <p className="text-sm text-red-700 dark:text-red-400 max-w-sm">
          Something went wrong loading your recipes. Please try again in a moment.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (plan === "signed-out") {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-600 bg-white/60 dark:bg-stone-800/40 px-8 py-14 text-center">
        <p className="text-sm text-[#5D6551] dark:text-stone-400 max-w-xs">{t.auth.signInPrompt}</p>
        <Link
          href="/profile"
          className="rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-opacity hover:opacity-90"
        >
          {t.auth.signInLink}
        </Link>
      </div>
    );
  }

  if (plan === "free") {
    return (
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 px-8 py-10 flex flex-col items-center text-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-sm">
          <BookmarkIcon size={24} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-[#232920] dark:text-stone-50">{t.savedRecipesTitle}</p>
          <p className="text-sm text-amber-800 dark:text-amber-300 max-w-sm">{t.subscribeCta}</p>
        </div>
        <button
          onClick={handleSubscribe}
          className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          {t.subscribeButton}
        </button>
        {billingError && <p className="text-xs text-red-600 dark:text-red-400">{billingError}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleManage}
          className="self-start text-xs text-[#9AA093] hover:text-[#232920] dark:hover:text-stone-200 underline underline-offset-2"
        >
          {t.manageSubscription}
        </button>
        {billingError && <span className="text-xs text-red-600 dark:text-red-400">{billingError}</span>}
      </div>

      <MealPlanStrip recipes={(recipes ?? []).map((r) => ({ id: r.id, title: r.title }))} t={t} />

      {recipes === null && <RecipesSkeleton />}

      {recipes !== null && recipes.length > 0 && (
        <CollectionFilterPills recipes={recipes} activeFilter={activeFilter} onSelect={setActiveFilter} />
      )}

      {recipes !== null && recipes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-600 bg-white/60 dark:bg-stone-800/40 px-8 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F7E8] dark:bg-stone-700 text-[#9AA093]">
            <BookmarkIcon size={20} />
          </span>
          <p className="text-sm text-[#5D6551] dark:text-stone-400 max-w-xs">{t.noSavedRecipes}</p>
          <Link
            href="/extract"
            className="rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-opacity hover:opacity-90"
          >
            {t.extract}
          </Link>
        </div>
      )}

      {recipes !== null && recipes.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {recipes
            .filter((r) => activeFilter === null || (r.collection || UNCATEGORIZED) === activeFilter)
            .map((r) => (
              <li
                key={r.id}
                className={`group flex flex-col gap-3 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 p-5 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)] ${
                  openId === r.id ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className="flex-1 text-left text-sm font-semibold text-[#232920] dark:text-stone-200 leading-snug hover:text-[#4D7C0F] dark:hover:text-white"
                  >
                    {r.title}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    aria-label={t.delete}
                    className="shrink-0 text-[#CDD4C2] hover:text-red-500 transition-colors"
                  >
                    <TrashIcon />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9AA093]">
                  {r.recipe.servings && (
                    <span className="rounded-full border border-[#E2E6D9] dark:border-stone-600 px-2 py-0.5">
                      {r.recipe.servings}
                    </span>
                  )}
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>

                {editingCollectionId === r.id ? (
                  <input
                    type="text"
                    autoFocus
                    defaultValue={r.collection ?? ""}
                    placeholder={UNCATEGORIZED}
                    onBlur={(e) => handleSetCollection(r.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingCollectionId(null);
                    }}
                    className="w-full rounded-lg border border-[#E2E6D9] dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-xs text-[#30362B] dark:text-stone-100 outline-none focus:border-[#61A00E]"
                  />
                ) : (
                  <button
                    onClick={() => setEditingCollectionId(r.id)}
                    className="flex w-fit items-center gap-1.5 rounded-full bg-[#F2F7E8] dark:bg-stone-700 px-2.5 py-1 text-[11px] font-medium text-[#5E7A33] dark:text-stone-400 hover:text-[#232920] dark:hover:text-stone-200"
                  >
                    <FolderIcon />
                    {r.collection || UNCATEGORIZED}
                  </button>
                )}

                <div className="mt-1 flex items-center gap-3 border-t border-[#E2E6D9] dark:border-stone-700 pt-3">
                  <Link
                    href={`/recipes/${r.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#4D7C0F] dark:text-lime-500 hover:text-[#232920] dark:hover:text-stone-100"
                  >
                    <CalculatorIcon />
                    Costing
                  </Link>
                  <button
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className="text-xs text-[#9AA093] hover:text-[#232920] dark:hover:text-stone-200"
                  >
                    {openId === r.id ? "Hide" : "View"}
                  </button>
                </div>

                {openId === r.id && (
                  <div className="border-t border-[#E2E6D9] dark:border-stone-700 pt-4">
                    <RecipeCard
                      recipe={r.recipe}
                      saveable={false}
                      onRecipeChange={async (updated) => {
                        setRecipes((prev) =>
                          prev?.map((x) => (x.id === r.id ? { ...x, recipe: updated, title: updated.title } : x)) ?? null,
                        );
                        await fetch(`/api/recipes/${r.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ recipe: updated }),
                        });
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function RecipesSkeleton() {
  return (
    <div className="grid w-full max-w-2xl animate-pulse gap-4 sm:grid-cols-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 p-5">
          <div className="h-4 w-3/4 rounded bg-[#F1F4EA] dark:bg-stone-700" />
          <div className="h-3 w-1/3 rounded bg-[#F1F4EA]/70 dark:bg-stone-700/70" />
          <div className="h-6 w-24 rounded-full bg-[#F1F4EA]/70 dark:bg-stone-700/70" />
        </div>
      ))}
    </div>
  );
}

function CollectionFilterPills({
  recipes,
  activeFilter,
  onSelect,
}: {
  recipes: SavedRecipe[];
  activeFilter: string | null;
  onSelect: (filter: string | null) => void;
}) {
  const counts = new Map<string, number>();
  for (const r of recipes) {
    const key = r.collection || UNCATEGORIZED;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const collections = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));

  if (collections.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          activeFilter === null
            ? "bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white"
            : "bg-[#F1F4EA] dark:bg-stone-700 text-[#6B7261] dark:text-stone-400 hover:text-[#232920] dark:hover:text-stone-200"
        }`}
      >
        All ({recipes.length})
      </button>
      {collections.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === c
              ? "bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white"
              : "bg-[#F1F4EA] dark:bg-stone-700 text-[#6B7261] dark:text-stone-400 hover:text-[#232920] dark:hover:text-stone-200"
          }`}
        >
          {c} ({counts.get(c)})
        </button>
      ))}
    </div>
  );
}

function FolderIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function BookmarkIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="11" x2="8" y2="11.01" />
      <line x1="12" y1="11" x2="12" y2="11.01" />
      <line x1="16" y1="11" x2="16" y2="11.01" />
      <line x1="8" y1="15" x2="8" y2="15.01" />
      <line x1="12" y1="15" x2="12" y2="15.01" />
      <line x1="16" y1="15" x2="16" y2="15.01" />
    </svg>
  );
}

function timeAgo(timestamp: number, language: string): string {
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const minutes = Math.round((timestamp - Date.now()) / 60_000);
  if (minutes > -60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}
