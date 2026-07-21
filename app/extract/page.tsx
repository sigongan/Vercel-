import Link from "next/link";
import { RecipeExtractor } from "@/components/RecipeExtractor";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";

const t = translations.en;

export default function ExtractPage() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center gap-8 px-5 py-10 pb-28 bg-[#FAFAF7] dark:bg-stone-950">
      <nav className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-800 dark:to-stone-800">
            <AvocadoMark size={30} />
          </span>
          <span className="font-display italic text-3xl text-[#232920] dark:text-stone-50">
            {t.title}
          </span>
        </Link>
      </nav>

      <AuthErrorBanner />

      <RecipeExtractor />
    </main>
  );
}
