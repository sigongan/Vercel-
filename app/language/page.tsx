"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, LANGUAGE_NAMES, type Language } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

const LANGUAGES: Language[] = ["en", "de", "it", "es", "fr", "pt"];

export default function LanguagePage() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const t = translations[language];

  return (
    <main className="relative flex-1 flex flex-col items-center gap-4 px-5 py-8 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="flex w-full max-w-2xl items-center gap-3 pb-1">
        <button
          type="button"
          onClick={() => {
            hapticTap();
            router.back();
          }}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#232920] transition-colors hover:bg-[#EDF1E4] dark:text-stone-100 dark:hover:bg-stone-700"
        >
          <BackIcon />
        </button>
        <h1 className="text-[19px] font-semibold text-[#232920] dark:text-stone-50">{t.settings.language}</h1>
      </div>

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E2E6D9] bg-white divide-y divide-[#EDF1E4] dark:border-stone-700 dark:bg-stone-800 dark:divide-stone-700">
        {LANGUAGES.map((code) => {
          const active = language === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                hapticTap();
                setLanguage(code);
                router.back();
              }}
              className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-700/40"
            >
              <span className="text-[15px] text-[#232920] dark:text-stone-100">{LANGUAGE_NAMES[code]}</span>
              <RadioDot active={active} />
            </button>
          );
        })}
      </div>
    </main>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        active ? "border-[#61A00E]" : "border-[#DCE2D2] dark:border-stone-600"
      }`}
    >
      {active && <span className="h-2.5 w-2.5 rounded-full bg-[#61A00E]" />}
    </span>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
