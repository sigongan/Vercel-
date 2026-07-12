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
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes((prev) => prev?.filter((r) => r.id !== id) ?? null);
    if (openId === id) setOpenId(null);
  }

  async function handleSubscribe() {
    const res = await fetch("/api/stripe/subscribe", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function handleManage() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t.savedRecipesTitle}</h1>
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            {t.backToExtractor}
          </Link>
        </div>

        {plan === "loading" && <div className="h-24" />}

        {plan === "signed-out" && (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t.auth.signInPrompt}</p>
        )}

        {plan === "free" && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-6 py-6">
            <p className="text-sm text-amber-800 dark:text-amber-300">{t.subscribeCta}</p>
            <button
              onClick={handleSubscribe}
              className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              {t.subscribeButton}
            </button>
          </div>
        )}

        {plan === "pro" && (
          <div className="flex flex-col gap-6">
            <button
              onClick={handleManage}
              className="self-start text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2"
            >
              {t.manageSubscription}
            </button>

            {recipes === null && <div className="h-24" />}

            {recipes !== null && recipes.length === 0 && (
              <p className="text-sm text-stone-500 dark:text-stone-400">{t.noSavedRecipes}</p>
            )}

            {recipes !== null && recipes.length > 0 && (
              <ul className="flex flex-col gap-3">
                {recipes.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <button
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="flex-1 text-left text-sm font-medium text-stone-800 dark:text-stone-200"
                      >
                        {r.title}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-xs text-stone-400 hover:text-red-500 whitespace-nowrap"
                      >
                        {t.delete}
                      </button>
                    </div>
                    {openId === r.id && (
                      <div className="border-t border-stone-200 dark:border-stone-800 p-5">
                        <RecipeCard
                          recipe={r.recipe}
                          onRecipeChange={async (updated) => {
                            setRecipes((prev) =>
                              prev?.map((x) => (x.id === r.id ? { ...x, recipe: updated, title: updated.title } : x)) ?? null
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
