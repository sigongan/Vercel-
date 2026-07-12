"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setStatus("signed-out");
        return;
      }

      const [{ data: profile }, res] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
        fetch(`/api/recipes/${id}`),
      ]);

      setIsPro(profile?.plan === "pro");

      if (!res.ok) {
        setStatus("not-found");
        return;
      }
      const body = await res.json();
      setSaved(body.recipe);
      setStatus("ready");
    });
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

        {status === "loading" && <div className="h-24" />}

        {status === "signed-out" && (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t.auth.signInPrompt}</p>
        )}

        {status === "not-found" && (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            This recipe doesn&apos;t exist or isn&apos;t yours.
          </p>
        )}

        {status === "ready" && saved && (
          <>
            <RecipeCard recipe={saved.recipe} onRecipeChange={handleRecipeChange} />

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
