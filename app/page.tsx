import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthPanel } from "@/components/AuthPanel";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";

const t = translations.en;

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center gap-8 px-5 py-10 bg-gradient-to-b from-[#fdf3ec] via-[#fbe9e2] to-[#fdf3ec] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-60px] right-[-60px] h-56 w-56 rounded-full bg-[#ffd4c2] opacity-40 blur-3xl dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-24 left-[-60px] h-44 w-44 rounded-full bg-[#d9e8c4] opacity-40 blur-3xl dark:hidden"
      />

      <nav className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f7dcc8] to-[#f3c9ae] shadow-[0_4px_12px_rgba(210,140,100,0.25)] dark:from-stone-800 dark:to-stone-800">
            <AvocadoMark size={30} />
          </span>
          <span className="font-display italic text-3xl text-[#7a4a3a] dark:text-stone-50">
            {t.title}
          </span>
        </Link>
        <div className="absolute right-0 top-0">
          <AuthPanel />
        </div>
      </nav>

      <AuthErrorBanner />

      <RecipeExtractor />
    </main>
  );
}
