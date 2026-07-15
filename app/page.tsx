import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthPanel } from "@/components/AuthPanel";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { SOURCE_ICONS } from "@/components/SourceIcons";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";

const t = translations.en;

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col items-center gap-10 px-5 pb-24 pt-6 bg-gradient-to-b from-[#fdf3ec] via-[#fbe9e2] to-[#fdf3ec] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-60px] right-[-60px] h-56 w-56 rounded-full bg-[#ffd4c2] opacity-40 blur-3xl dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-24 left-[-60px] h-44 w-44 rounded-full bg-[#d9e8c4] opacity-40 blur-3xl dark:hidden"
      />

      <nav className="relative z-10 flex w-full max-w-2xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f7dcc8] to-[#f3c9ae] shadow-[0_4px_12px_rgba(210,140,100,0.25)] dark:from-stone-800 dark:to-stone-800">
            <AvocadoMark size={22} />
          </span>
          <span className="font-display italic text-xl text-[#7a4a3a] dark:text-stone-50">
            {t.title}
          </span>
        </Link>
        <AuthPanel />
      </nav>

      <AuthErrorBanner />

      <header className="relative z-[1] flex flex-col items-center gap-3 text-center max-w-2xl pt-2">
        <p className="text-base sm:text-lg text-[#a97e6b] dark:text-stone-400 leading-relaxed max-w-xl">
          {t.tagline}
        </p>
        <ul className="flex flex-wrap justify-center gap-2 mt-1">
          {t.sources.map((source) => (
            <li
              key={source}
              className="flex items-center gap-1.5 text-xs font-medium text-[#a97e6b] dark:text-stone-400 bg-white dark:bg-stone-900/70 shadow-[0_2px_8px_rgba(180,120,90,0.10)] dark:shadow-none border border-transparent dark:border-stone-800 rounded-full pl-2.5 pr-3 py-1"
            >
              {SOURCE_ICONS[source]}
              {source}
            </li>
          ))}
        </ul>
      </header>

      <RecipeExtractor />

      <p className="relative z-[1] text-xs text-[#c3a08d] dark:text-stone-500 text-center max-w-md leading-relaxed">
        {t.tip}
      </p>

      <footer className="relative z-[1] flex items-center gap-4 text-xs text-[#c3a08d] dark:text-stone-600 mt-4">
        <Link
          href="/margin-calculator"
          className="hover:text-[#7a4a3a] dark:hover:text-stone-300 underline underline-offset-2"
        >
          Margin Calculator
        </Link>
        <Link
          href="/alternatives"
          className="hover:text-[#7a4a3a] dark:hover:text-stone-300 underline underline-offset-2"
        >
          Alternatives
        </Link>
        <Link
          href="/blog"
          className="hover:text-[#7a4a3a] dark:hover:text-stone-300 underline underline-offset-2"
        >
          Blog
        </Link>
        <Link
          href="/terms"
          className="hover:text-[#7a4a3a] dark:hover:text-stone-300 underline underline-offset-2"
        >
          {t.footerTerms}
        </Link>
        <Link
          href="/privacy"
          className="hover:text-[#7a4a3a] dark:hover:text-stone-300 underline underline-offset-2"
        >
          {t.footerPrivacy}
        </Link>
      </footer>
    </main>
  );
}
