"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRecentRecipes } from "@/lib/recentRecipes";
import { useGroceryList } from "@/lib/groceryList";
import { GroceryListSheet } from "@/components/GroceryList";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { hapticTap } from "@/lib/nativeApp";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function Home() {
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();
  const recent = useRecentRecipes();
  const groceryItems = useGroceryList();
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [homeQuery, setHomeQuery] = useState("");

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

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    function loadDisplayName() {
      fetch("/api/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((body) => {
          if (!body.signedIn) {
            setDisplayName(null);
            return;
          }
          // Only Google/Apple sign-in has a real name on file — email
          // magic-link users get the email's local part as a reasonable
          // stand-in ("jess@..." -> "Jess") rather than no name at all.
          const fallback = typeof body.email === "string" ? body.email.split("@")[0] : null;
          const name: string | null = body.name || fallback;
          if (name) setDisplayName(name.charAt(0).toUpperCase() + name.slice(1));
        })
        .catch(() => {});
    }

    loadDisplayName();

    // Native sign-in doesn't reload the page — it just sets the session and
    // fires this event, so this greeting has to refresh itself in place.
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "INITIAL_SESSION") loadDisplayName();
    });
    return () => subscription.unsubscribe();
  }, []);

  const unchecked = groceryItems.filter((i) => !i.checked).length;

  return (
    <main className="relative flex-1 flex flex-col items-center gap-5 px-5 py-8 pb-28 bg-[#FAFAF7] dark:bg-stone-900">
      <nav className="flex w-full max-w-2xl items-center gap-2">
        <AvocadoMark size={26} />
        {displayName && (
          <span className="text-[17px] font-semibold text-[#232920] dark:text-stone-50">
            {t.homeHiUser(displayName)}
          </span>
        )}
      </nav>

      <AuthErrorBanner />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = homeQuery.trim();
          if (!q) return;
          hapticTap();
          router.push(`/search?q=${encodeURIComponent(q)}&auto=1`);
        }}
        className="relative w-full max-w-2xl"
      >
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA093]">
          <SearchGlyph />
        </span>
        <input
          type="search"
          value={homeQuery}
          onChange={(e) => setHomeQuery(e.target.value)}
          placeholder={t.homeSearchPlaceholder}
          className="w-full rounded-full border-none bg-[#F1F4EA] dark:bg-stone-800 py-3.5 pl-11 pr-4 text-[15px] text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:ring-2 focus:ring-[#61A00E]/30"
        />
      </form>

      <Link
        href="/extract"
        onClick={() => hapticTap()}
        className="flex w-full max-w-2xl items-center gap-4 rounded-[28px] bg-gradient-to-br from-[#9ED13A] to-[#6FAE15] px-5 py-4 shadow-[0_10px_28px_rgba(97,160,14,0.25)] transition-transform active:scale-[0.98]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <AvocadoMark size={28} />
        </span>
        <span className="flex-1 text-[17px] font-semibold text-white">{t.homeStartExtract}</span>
        <span className="text-white/70">
          <Chevron />
        </span>
      </Link>

      <button
        type="button"
        onClick={() => {
          hapticTap();
          setGroceryOpen(true);
        }}
        className="flex w-full max-w-2xl items-center gap-3.5 rounded-2xl border border-[#E2E6D9] bg-white px-5 py-3.5 text-left transition-colors hover:bg-[#FCFCF9] dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F4EA] dark:bg-stone-700 text-[#4D7C0F] dark:text-stone-400">
          <CartIcon />
        </span>
        <span className="flex-1 text-[15px] font-medium text-[#232920] dark:text-stone-100">
          {t.homeGroceryShortcut}
        </span>
        {unchecked > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#61A00E] px-1.5 text-xs font-semibold text-white">
            {unchecked}
          </span>
        )}
        <Chevron />
      </button>

      <section className="flex w-full max-w-2xl flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#9AA093]">
            {t.homeRecentTitle}
          </h2>
          {recent.length > 0 && (
            <Link
              href="/library"
              className="text-[13px] font-medium text-[#4D7C0F] dark:text-lime-500 hover:opacity-80"
            >
              {t.homeSeeAll}
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-700 px-5 py-9 text-center text-sm text-[#9AA093]">
            {t.homeEmptyRecent}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E2E6D9] bg-white divide-y divide-[#EDF1E4] dark:border-stone-700 dark:bg-stone-800 dark:divide-stone-700">
            {recent.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`/extract?recent=${item.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-700/40"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#232920] dark:text-stone-100">
                  {item.recipe.title}
                </span>
                <Chevron />
              </Link>
            ))}
          </div>
        )}
      </section>

      {groceryOpen && (
        <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} t={t} />
      )}
    </main>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#CDD4C2] dark:text-stone-600">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
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
