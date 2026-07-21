import type { Metadata } from "next";
import Link from "next/link";
import { MarginCalculator } from "@/components/MarginCalculator";
import { GoProButton } from "@/components/GoProButton";
import { SITE_NAME } from "@/lib/siteConfig";
import type { Recipe } from "@/lib/types/recipe";

export const metadata: Metadata = {
  title: "Recipe Cost & Margin Calculator for Cafes, Bakeries & Home Food Businesses",
  description:
    "Price your menu with confidence. Enter ingredient costs, set a target gross profit % or menu price, and get a GST-ready price per portion — free to try, no signup required.",
};

/** Demo batch — a home-bakery-style recipe, not a single dinner portion, so the tool reads naturally for the audience this page targets. */
const DEMO_RECIPE: Recipe = {
  title: "Classic Vanilla Cupcakes",
  description: "A 12-cupcake batch, the size most home bakers sell by the box.",
  servings: "12 cupcakes",
  ingredients: [
    { name: "Plain flour", amount: "250g" },
    { name: "Caster sugar", amount: "220g" },
    { name: "Unsalted butter", amount: "170g" },
    { name: "Eggs", amount: "3" },
    { name: "Whole milk", amount: "120ml" },
    { name: "Vanilla extract", amount: "2 tsp" },
    { name: "Baking powder", amount: "2 tsp" },
    { name: "Cream cheese frosting", amount: "300g", estimated: true },
  ],
  steps: [],
  tags: [],
  sourceType: "text",
};

export default function MarginCalculatorPage() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            ← {SITE_NAME}
          </Link>
        </div>

        <header className="flex flex-col items-center gap-5 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-orange-700 dark:text-orange-400">
            For cafes, bakeries & home food businesses
          </span>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-stone-900 dark:text-stone-50 max-w-2xl">
            Stop guessing your menu prices
          </h1>
          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed max-w-xl">
            Enter what you actually pay for ingredients, set a target gross profit % (or a price you
            already charge), and get a GST-ready price per portion — instantly.
          </p>
          <p className="text-xs text-stone-400">
            Try it live below with a sample recipe — no signup needed.
          </p>
        </header>

        <MarginCalculator recipe={DEMO_RECIPE} />

        <section className="flex flex-col gap-6">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-stone-900 dark:text-stone-50 text-center">
            Built for people actually selling food
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Cafes & bakeries",
                desc: "Cost every item on the menu properly instead of eyeballing a price and hoping the margin works out.",
              },
              {
                title: "Home bakers & side hustles",
                desc: "Selling cupcakes or banana bread on Instagram? Know your real cost per unit before you set a price.",
              },
              {
                title: "Caterers & meal preppers",
                desc: "Scale a recipe to a full batch and see exactly what it costs per portion before you quote a job.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6"
              >
                <h3 className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">{card.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-stone-900 dark:text-stone-50 text-center">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Get a recipe into Avocato",
                desc: "Extract one from a video, photo, or link — or paste your own recipe text, always free.",
              },
              {
                step: "2",
                title: "Enter your real costs",
                desc: "Fill in what you pay per kg, per litre, or per unit for each ingredient.",
              },
              {
                step: "3",
                title: "Get your price",
                desc: "Set a target GP% or your current price, and see the GST breakdown per portion.",
              },
            ].map((s) => (
              <li
                key={s.step}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-sm font-semibold">
                  {s.step}
                </span>
                <h3 className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">{s.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 px-8 py-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-stone-900 dark:text-stone-50">
            Cost your own recipes, saved and ready anytime
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md">
            Pro includes the cost & margin calculator on every saved recipe, plus an unlimited recipe
            library you can come back to.
          </p>
          <GoProButton />
        </section>
      </div>
    </main>
  );
}
