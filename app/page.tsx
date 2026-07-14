import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthPanel } from "@/components/AuthPanel";
import { LandingSections } from "@/components/LandingSections";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { SOURCE_ICONS } from "@/components/SourceIcons";
import { translations } from "@/lib/i18n";

const t = translations.en;

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col items-center gap-12 px-5 pb-24 pt-6 bg-stone-50 dark:bg-stone-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(234,88,12,0.07),transparent_70%)]"
      />

      <div className="relative z-10 flex w-full max-w-2xl justify-end">
        <AuthPanel />
      </div>

      <AuthErrorBanner />

      <header className="relative z-[1] flex flex-col items-center gap-5 text-center max-w-2xl pt-4">
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
              className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 rounded-full pl-2.5 pr-3 py-1"
            >
              {SOURCE_ICONS[source]}
              {source}
            </li>
          ))}
        </ul>
      </header>

      <RecipeExtractor />

      <p className="relative z-[1] text-xs text-stone-400 dark:text-stone-500 text-center max-w-md leading-relaxed">
        {t.tip}
      </p>

      <LandingSections />

      <footer className="relative z-[1] flex items-center gap-4 text-xs text-stone-400 dark:text-stone-600 mt-4">
        <Link
          href="/margin-calculator"
          className="hover:text-stone-600 dark:hover:text-stone-300 underline underline-offset-2"
        >
          Margin Calculator
        </Link>
        <Link
          href="/alternatives"
          className="hover:text-stone-600 dark:hover:text-stone-300 underline underline-offset-2"
        >
          Alternatives
        </Link>
        <Link href="/blog" className="hover:text-stone-600 dark:hover:text-stone-300 underline underline-offset-2">
          Blog
        </Link>
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
