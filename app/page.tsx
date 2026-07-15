import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthPanel } from "@/components/AuthPanel";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
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

      <nav className="relative z-10 flex w-full max-w-2xl items-center justify-end">
        <Link
          href="/"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5"
        >
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

      <RecipeExtractor />

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
