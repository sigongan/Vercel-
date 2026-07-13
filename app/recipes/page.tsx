"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { RecipeCard } from "@/components/RecipeCard";
import type { Recipe } from "@/lib/types/recipe";

interface SavedRecipe {
  id: string;
  title: string;
  recipe: Recipe;
  created_at: string;
}

type Plan = "loading" | "signed-out" | "free" | "pro";

export default function RecipesPage() {
  const { language } = useLanguage();
  const t = translations[language];

  const [plan, setPlan] = useState<Plan>("loading");
  const [recipes, setRecipes] = useState<SavedRecipe[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setPlan("signed-out");
        return;
      }
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
      setPlan(data?.plan === "pro" ? "pro" : "free");

      if (data?.plan === "pro") {
        const res = await fetch("/api/recipes");
        if (res.ok) {
          const body = await res.json();
          setRecipes(body.recipes);
        }
      }
    });
  }, []);

  async function handleDelete(id: string) {
    setRecipes((prev) => prev?.filter((r) => r.id !== id) ?? null);
    if (openId === id) setOpenId(null);
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
  }

  async function handleSubscribe() {
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError(data.error || t.subscribeUnavailable);
      }
    } catch {
      setBillingError(t.subscribeUnavailable);
    }
  }

  async function handleManage() {
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError(data.error || t.subscribeUnavailable);
      }
    } catch {
      setBillingError(t.subscribeUnavailable);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900">
              <BookmarkIcon size={18} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {t.savedRecipesTitle}
              </h1>
              {plan === "pro" && recipes !== null && (
                <p className="text-xs text-stone-400">
                  {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} saved
                </p>
              )}
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
          >
            {t.backToExtractor}
          </Link>
        </div>

        {plan === "loading" && <div className="h-24" />}

        {plan === "signed-out" && (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t.auth.signInPrompt}</p>
        )}

        {plan === "free" && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 px-8 py-10 flex flex-col items-center text-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-sm">
              <BookmarkIcon size={24} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">
                {t.savedRecipesTitle}
              </p>
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
        )}

        {plan === "pro" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleManage}
                className="self-start text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2"
              >
                {t.manageSubscription}
              </button>
              {billingError && <span className="text-xs text-red-600 dark:text-red-400">{billingError}</span>}
            </div>

            {recipes === null && <div className="h-24" />}

            {recipes !== null && recipes.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/60 dark:bg-stone-900/40 px-8 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400">
                  <BookmarkIcon size={20} />
                </span>
                <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">{t.noSavedRecipes}</p>
                <Link
                  href="/"
                  className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-stone-700 dark:hover:bg-stone-300"
                >
                  {t.extract}
                </Link>
              </div>
            )}

            {recipes !== null && recipes.length > 0 && (
              <ul className="grid gap-4 sm:grid-cols-2">
                {recipes.map((r) => (
                  <li
                    key={r.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="flex-1 text-left text-sm font-semibold text-stone-800 dark:text-stone-200 leading-snug hover:text-stone-950 dark:hover:text-white"
                      >
                        {r.title}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        aria-label={t.delete}
                        className="shrink-0 text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                      {r.recipe.servings && (
                        <span className="rounded-full border border-stone-200 dark:border-stone-700 px-2 py-0.5">
                          {r.recipe.servings}
                        </span>
                      )}
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 border-t border-stone-100 dark:border-stone-800 pt-3">
                      <Link
                        href={`/recipes/${r.id}`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        <CalculatorIcon />
                        Costing
                      </Link>
                      <button
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      >
                        {openId === r.id ? "Hide" : "View"}
                      </button>
                    </div>

                    {openId === r.id && (
                      <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
                        <RecipeCard
                          recipe={r.recipe}
                          onRecipeChange={async (updated) => {
                            setRecipes((prev) =>
                              prev?.map((x) =>
                                x.id === r.id ? { ...x, recipe: updated, title: updated.title } : x
                              ) ?? null
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
        )}
      </div>
    </main>
  );
}

function BookmarkIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CalculatorIcon() {
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
