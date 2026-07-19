import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthPanel } from "@/components/AuthPanel";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";

const t = translations.en;

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center gap-8 px-5 py-10 bg-gradient-to-b from-[#F7F5EF] via-[#EFF3E8] to-[#F7F5EF] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-60px] right-[-60px] h-56 w-56 rounded-full bg-[#CFE0C2] opacity-40 blur-3xl dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-24 left-[-60px] h-44 w-44 rounded-full bg-[#C9DCC0] opacity-40 blur-3xl dark:hidden"
      />

      <nav className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D9E7CC] to-[#C2D9B0] shadow-[0_4px_12px_rgba(120,155,105,0.25)] dark:from-stone-800 dark:to-stone-800">
            <AvocadoMark size={30} />
          </span>
          <span className="font-display italic text-3xl text-[#3D5A38] dark:text-stone-50">
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
