"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { RecipeCard } from "@/components/RecipeCard";
import { MarginCalculator } from "@/components/MarginCalculator";
import { PaywallGate } from "@/components/PaywallGate";
import type { Recipe } from "@/lib/types/recipe";

interface SavedRecipe {
  id: string;
  title: string;
  recipe: Recipe;
  created_at: string;
}

type Status = "loading" | "signed-out" | "not-found" | "ready";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const t = translations[language];

  const [status, setStatus] = useState<Status>("loading");
  const [isPro, setIsPro] = useState(false);
  const [saved, setSaved] = useState<SavedRecipe | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (!body.signedIn) {
          setStatus("signed-out");
          return;
        }
        if (body.notFound || !body.recipe) {
          setStatus("not-found");
          return;
        }
        setIsPro(body.plan === "pro");
        setSaved(body.recipe);
        setStatus("ready");
      })
      .catch(() => setStatus("not-found"));
  }, [id]);

  async function handleRecipeChange(updated: Recipe) {
    setSaved((prev) => (prev ? { ...prev, recipe: updated, title: updated.title } : prev));
    await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe: updated }),
    });
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link
            href="/recipes"
            className="text-sm text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            ← {t.savedRecipesTitle}
          </Link>
        </div>

        {status === "loading" && (
          <div
            className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-10 flex flex-col gap-4"
            aria-hidden
          >
            <div className="h-3 w-16 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-8 w-3/4 rounded-lg bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-full rounded bg-stone-100 dark:bg-stone-800/70" />
            <div className="h-4 w-2/3 rounded bg-stone-100 dark:bg-stone-800/70" />
            <div className="mt-4 grid gap-6 sm:grid-cols-[minmax(220px,260px)_1fr]">
              <div className="h-40 rounded-xl bg-stone-100 dark:bg-stone-800/70" />
              <div className="h-40 rounded-xl bg-stone-100 dark:bg-stone-800/70" />
            </div>
          </div>
        )}

        {status === "signed-out" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/60 dark:bg-stone-900/40 px-8 py-14 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">{t.auth.signInPrompt}</p>
            <Link
              href="/"
              className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-stone-700 dark:hover:bg-stone-300"
            >
              {t.auth.signInLink}
            </Link>
          </div>
        )}

        {status === "not-found" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/60 dark:bg-stone-900/40 px-8 py-14 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">
              This recipe doesn&apos;t exist or isn&apos;t yours.
            </p>
            <Link
              href="/recipes"
              className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-stone-700 dark:hover:bg-stone-300"
            >
              {t.savedRecipesTitle}
            </Link>
          </div>
        )}

        {status === "ready" && saved && (
          <>
            <RecipeCard recipe={saved.recipe} saveable={false} onRecipeChange={handleRecipeChange} />

            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
                Chef&apos;s Technical Tips &amp; Margin Calculator
              </h2>
              <PaywallGate locked={!isPro}>
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 flex flex-col gap-2">
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                      Chef&apos;s Technical Tips
                    </h3>
                    <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 whitespace-pre-line">
                      {saved.recipe.notes ||
                        "No technical notes yet. Use Edit on the recipe card to add batch-scaling tips, ratios, and plating notes for your team."}
                    </p>
                  </div>

                  <MarginCalculator recipe={saved.recipe} />
                </div>
              </PaywallGate>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
