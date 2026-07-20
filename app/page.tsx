import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthPanel } from "@/components/AuthPanel";
import { SettingsButton } from "@/components/SettingsButton";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";

const t = translations.en;

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center gap-8 px-5 py-10 bg-gradient-to-b from-[#FAFAF7] via-[#F4F6EE] to-[#FAFAF7] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-60px] right-[-60px] h-56 w-56 rounded-full bg-[#D9EEB2] opacity-40 blur-3xl dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-24 left-[-60px] h-44 w-44 rounded-full bg-[#C6E596] opacity-40 blur-3xl dark:hidden"
      />

      <nav className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-800 dark:to-stone-800">
            <AvocadoMark size={30} />
          </span>
          <span className="font-display italic text-3xl text-[#232920] dark:text-stone-50">
            {t.title}
          </span>
        </Link>
        <div className="absolute right-0 top-0 flex items-center gap-1">
          <SettingsButton />
          <AuthPanel />
        </div>
      </nav>

      <AuthErrorBanner />

      <RecipeExtractor />
    </main>
  );
}
