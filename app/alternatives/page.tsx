import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/siteConfig";
import { ALTERNATIVES } from "@/lib/alternatives";

export const metadata: Metadata = {
  title: "Avocato Alternatives & Comparisons",
  description: "How Avocato compares to other recipe extraction tools — an honest, feature-by-feature look.",
};

export default function AlternativesHubPage() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
          ← {SITE_NAME}
        </Link>

        <header className="flex flex-col gap-3">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
            Comparing Avocato
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Other recipe tools are good at what they do — here&apos;s an honest, feature-by-feature look
            at how Avocato is different, so you can pick whichever actually fits how you cook.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {ALTERNATIVES.map((alt) => (
            <Link
              key={alt.slug}
              href={`/alternatives/${alt.slug}`}
              className="flex flex-col gap-1.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
            >
              <span className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">
                Avocato vs {alt.name}
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400">{alt.tagline}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
