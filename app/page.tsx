"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";
import { useRecentRecipes } from "@/lib/recentRecipes";
import { useGroceryList } from "@/lib/groceryList";
import { GroceryListSheet } from "@/components/GroceryList";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { hapticTap } from "@/lib/nativeApp";

export default function Home() {
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();
  const recent = useRecentRecipes();
  const groceryItems = useGroceryList();
  const [groceryOpen, setGroceryOpen] = useState(false);

  useEffect(() => {
    // Any Universal Link into the app (share extension, marketing links,
    // an old bookmark) still targets /?url=<link> — this is the one place
    // that catches all of those and forwards to the Extract tab, which is
    // what actually reads ?url= and starts extraction. See
    // NativeAppInit.tsx for the separate in-app-running (warm share) path,
    // which doesn't go through a page load at all so can't be caught here.
    const shared = new URLSearchParams(window.location.search).get("url");
    if (shared) router.replace(`/extract?url=${encodeURIComponent(shared)}`);
  }, [router]);

  return (
    <main className="relative flex-1 flex flex-col items-center gap-8 px-5 py-10 pb-28 bg-gradient-to-b from-[#FAFAF7] via-[#F4F6EE] to-[#FAFAF7] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-60px] right-[-60px] h-56 w-56 rounded-full bg-[#D9EEB2] opacity-40 blur-3xl dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-24 left-[-60px] h-44 w-44 rounded-full bg-[#C6E596] opacity-40 blur-3xl dark:hidden"
      />

      <nav className="relative z-10 flex w-full max-w-2xl items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-800 dark:to-stone-800">
            <AvocadoMark size={30} />
          </span>
          <span className="font-display italic text-3xl text-[#232920] dark:text-stone-50">
            {t.title}
          </span>
        </div>
      </nav>

      <AuthErrorBanner />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-2 text-center">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#232920] dark:text-stone-50">
          {t.homeGreeting}
        </h1>
        <p className="text-base text-[#5D6551] dark:text-stone-400 max-w-md">{t.homeGreetingSub}</p>
      </div>

      <Link
        href="/extract"
        onClick={() => hapticTap()}
        className="relative z-10 flex w-full max-w-2xl items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white py-4 text-[15px] font-semibold shadow-[0_8px_20px_rgba(97,160,14,0.35)] transition-opacity hover:opacity-90"
      >
        <PlusIcon />
        {t.homeStartExtract}
      </Link>

      <button
        type="button"
        onClick={() => {
          hapticTap();
          setGroceryOpen(true);
        }}
        className="relative z-10 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-[#E2E6D9] dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-4 text-left shadow-[0_4px_14px_rgba(105,150,55,0.08)] transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2F7E8] dark:bg-stone-800 text-[#4D7C0F] dark:text-stone-400">
          <CartIcon />
        </span>
        <span className="flex-1 text-sm font-medium text-[#232920] dark:text-stone-200">
          {t.homeGroceryShortcut}
        </span>
        {groceryItems.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#61A00E] px-1.5 text-xs font-semibold text-white">
            {groceryItems.filter((i) => !i.checked).length}
          </span>
        )}
      </button>

      <section className="relative z-10 flex w-full max-w-2xl flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9AA093]">
            {t.homeRecentTitle}
          </h2>
          {recent.length > 0 && (
            <Link
              href="/library"
              className="text-xs font-medium text-[#4D7C0F] dark:text-lime-500 hover:text-[#232920] dark:hover:text-stone-100"
            >
              {t.homeSeeAll}
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-800 bg-white/60 dark:bg-stone-900/40 px-5 py-8 text-center text-sm text-[#9AA093]">
            {t.homeEmptyRecent}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/extract?recent=${item.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-white dark:bg-stone-900 px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none dark:border-stone-800 transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#30362B] dark:text-stone-200">
                    {item.recipe.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {groceryOpen && (
        <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} t={t} />
      )}
    </main>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
