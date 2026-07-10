"use client";

import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthPanel } from "@/components/AuthPanel";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  return (
    <main className="relative flex-1 flex flex-col items-center gap-12 px-5 pb-24 pt-20 bg-stone-50 dark:bg-stone-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(234,88,12,0.07),transparent_70%)]"
      />

      <div className="absolute top-5 inset-x-5 z-10 flex items-center justify-between gap-3">
        <AuthPanel />
        <div className="ml-auto flex rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-0.5 text-xs font-medium shadow-sm">
          {(["ko", "en"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                language === lang
                  ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              {lang === "ko" ? "한국어" : "EN"}
            </button>
          ))}
        </div>
      </div>

      <header className="relative z-[1] flex flex-col items-center gap-5 text-center max-w-2xl pt-8">
        <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-stone-900 dark:text-stone-50">
          {t.title}
        </h1>
        <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed max-w-xl">
          {t.tagline}
        </p>
        <ul className="flex flex-wrap justify-center gap-2 mt-1">
          {t.sources.map((source) => (
            <li
              key={source}
              className="text-xs text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 rounded-full px-3 py-1"
            >
              {source}
            </li>
          ))}
        </ul>
      </header>

      <RecipeExtractor />

      <p className="relative z-[1] text-xs text-stone-400 dark:text-stone-500 text-center max-w-md leading-relaxed">
        {t.tip}
      </p>

      <footer className="relative z-[1] flex items-center gap-4 text-xs text-stone-400 dark:text-stone-600 mt-4">
        <Link href="/terms" className="hover:text-stone-600 dark:hover:text-stone-300 underline underline-offset-2">
          {t.footerTerms}
        </Link>
        <Link href="/privacy" className="hover:text-stone-600 dark:hover:text-stone-300 underline underline-offset-2">
          {t.footerPrivacy}
        </Link>
      </footer>
    </main>
  );
}
