"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCachedMe, fetchMe } from "@/lib/meCache";
import { useRecentRecipes } from "@/lib/recentRecipes";
import { useGroceryList } from "@/lib/groceryList";
import { useWantToCook } from "@/lib/wantToCook";
import { GroceryListSheet } from "@/components/GroceryList";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { hapticTap } from "@/lib/nativeApp";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Only Google/Apple sign-in has a real name on file — email magic-link
// users get the email's local part as a reasonable stand-in
// ("jess@..." -> "Jess") rather than no name at all.
function nameFrom(body: { name?: string | null; email?: string }): string | null {
  const fallback = typeof body.email === "string" ? body.email.split("@")[0] : null;
  const name = body.name || fallback;
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null;
}

export default function Home() {
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();
  const recent = useRecentRecipes();
  const groceryItems = useGroceryList();
  const wantToCook = useWantToCook();
  const [groceryOpen, setGroceryOpen] = useState(false);
  // Render the last known greeting immediately instead of a nameless icon
  // for a beat on every visit — the fresh fetch below still runs right away.
  const [displayName, setDisplayName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = getCachedMe();
    return cached?.signedIn ? nameFrom(cached) : null;
  });
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

    async function loadDisplayName() {
      const body = await fetchMe();
      if (!body || !body.signedIn) {
        setDisplayName(null);
        return;
      }
      const name = nameFrom(body);
      if (name) setDisplayName(name);
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
      <div className="flex w-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AvocadoMark size={26} />
          <span className="text-[21px] font-bold text-[#232920] dark:text-stone-50">
            {displayName ? t.homeHiUser(displayName) : t.title}
          </span>
        </div>
        <Link
          href="/profile"
          onClick={() => hapticTap()}
          aria-label={t.profileTitle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#5D6551] dark:text-stone-300 transition-colors hover:border-[#C4E484] dark:hover:border-stone-600"
        >
          <ProfileGlyph />
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = homeQuery.trim();
          if (!q) return;
          hapticTap();
          router.push(`/search?q=${encodeURIComponent(q)}&auto=1`);
        }}
        className="w-full max-w-2xl"
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA093]">
            <SearchGlyph />
          </span>
          <input
            type="search"
            value={homeQuery}
            onChange={(e) => setHomeQuery(e.target.value)}
            placeholder={t.homeSearchPlaceholder}
            className="w-full rounded-full border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-900 py-3.5 pl-11 pr-4 text-[15px] text-[#232920] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10"
          />
        </div>
        <p className="mt-2 px-1 text-xs leading-relaxed text-[#9AA093]">{t.searchScoutTagline}</p>
      </form>

      <Link
        href="/extract"
        onClick={() => hapticTap()}
        className="flex w-full max-w-2xl items-center gap-3.5 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 px-5 py-3.5 transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-700/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F4EA] dark:bg-stone-700 text-[#4D7C0F] dark:text-stone-400">
          <ExtractGlyph />
        </span>
        <span className="flex-1 text-[15px] font-semibold text-[#232920] dark:text-stone-100">{t.homeStartExtract}</span>
        <Chevron />
      </Link>

      <AuthErrorBanner />

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

      {wantToCook.length > 0 && (
        <Link
          href="/library"
          onClick={() => hapticTap()}
          className="flex w-full max-w-2xl items-center gap-3.5 rounded-2xl border border-[#E2E6D9] bg-white px-5 py-3.5 text-left transition-colors hover:bg-[#FCFCF9] dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F4EA] dark:bg-stone-700 text-[#4D7C0F] dark:text-stone-400">
            <HeartIcon />
          </span>
          <span className="flex-1 text-[15px] font-medium text-[#232920] dark:text-stone-100">
            {t.libraryWantToCookTab}
          </span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#61A00E] px-1.5 text-xs font-semibold text-white">
            {wantToCook.length}
          </span>
          <Chevron />
        </Link>
      )}

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

      <section className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-[#E2E6D9] bg-white px-5 py-5 dark:border-stone-700 dark:bg-stone-800">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#9AA093]">{t.howTitle}</h2>
        <ol className="flex flex-col gap-4">
          <HowStep n={1} title={t.how1Title} desc={t.how1Desc} />
          <HowStep n={2} title={t.how2Title} desc={t.how2Desc} />
          <HowStep n={3} title={t.how3Title} desc={t.how3Desc} />
        </ol>
      </section>

      {groceryOpen && (
        <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} t={t} />
      )}
    </main>
  );
}

function HowStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-[13px] font-bold text-white">
        {n}
      </span>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <p className="text-[14px] font-semibold text-[#232920] dark:text-stone-100">{title}</p>
        <p className="text-[13px] leading-relaxed text-[#6B7261] dark:text-stone-400">{desc}</p>
      </div>
    </li>
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

function ProfileGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function ExtractGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v14" />
      <path d="m6 11 6 6 6-6" />
      <path d="M5 21h14" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
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
