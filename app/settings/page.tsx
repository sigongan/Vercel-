"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";
import { SettingsFields } from "@/components/SettingsFields";
import { getCachedMe, fetchMe } from "@/lib/meCache";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function SettingsPage() {
  const { language } = useLanguage();
  const t = translations[language].settings;
  const router = useRouter();

  // Same SSR-safe pattern as Profile: start at the value SSR produced
  // (signed out), apply the session cache post-mount, then correct it
  // with the network fetch — see app/profile/page.tsx for why this can't
  // read the cache inside useState's initializer.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    async function load() {
      const cached = getCachedMe();
      if (cached) setSignedIn(cached.signedIn);
      const body = await fetchMe();
      if (body) setSignedIn(body.signedIn);
    }
    load();
  }, []);

  return (
    <main className="relative flex-1 flex flex-col items-center gap-6 px-5 py-6 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="relative flex w-full max-w-2xl items-center justify-center">
        <button
          type="button"
          onClick={() => {
            hapticTap();
            router.back();
          }}
          aria-label={t.close}
          className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full text-[#232920] transition-colors hover:bg-[#F1F4EA] dark:text-stone-100 dark:hover:bg-stone-700"
        >
          <BackIcon />
        </button>
        <h1 className="text-[17px] font-semibold text-[#232920] dark:text-stone-50">{t.title}</h1>
      </div>

      <SettingsFields signedIn={signedIn} />
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 19-7-7 7-7" />
    </svg>
  );
}
