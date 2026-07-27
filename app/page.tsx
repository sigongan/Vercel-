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
import { UploadSourceSheet } from "@/components/UploadSourceSheet";
import { HomeHero } from "@/components/HomeHero";
import { ExtractionProgress } from "@/components/ExtractionProgress";
import { RecipeCard } from "@/components/RecipeCard";
import { useExtraction } from "@/hooks/useExtraction";
import { compressImageFile } from "@/lib/compressImage";
import { DOCUMENT_ACCEPT_TYPES, PHOTO_ACCEPT_TYPES } from "@/lib/uploadAccept";
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
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [preparingFile, setPreparingFile] = useState(false);
  const {
    status: extractStatus,
    errorMessage: extractError,
    recipe: extractedRecipe,
    setRecipe: setExtractedRecipe,
    startExtraction,
    reset: resetExtraction,
  } = useExtraction();
  // Starts null on both server and client so the first client render always
  // matches the server-rendered HTML (a `typeof window` branch here used to
  // read the session-cached name straight into the initial state, which
  // matched on a cold visit but diverged from the SSR'd "Avocato" title on
  // every later visit in the same session — React would then discard and
  // rebuild the header on hydration, a visible flash). The effect below
  // still applies the cached name right after mount, before the network
  // fetch resolves, so returning visitors still see their name almost
  // immediately — just one render tick later, post-hydration, not pre-.
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

    async function loadDisplayName() {
      // Apply the session-cached name first (before the network round-trip
      // below resolves) so a returning visitor sees it almost immediately —
      // safe here, post-hydration, unlike doing this in useState's initializer.
      const cached = getCachedMe();
      if (cached?.signedIn) {
        const name = nameFrom(cached);
        if (name) setDisplayName(name);
      }

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

  // Picking a photo/file here runs the extraction on Home itself rather than
  // handing off to the Extract tab — one tap from opening the app to the
  // picker, instead of tap → new page → tap the dropzone → pick.
  async function handleHomeFile(selected: File | null) {
    if (!selected) return;
    setPreparingFile(true);
    try {
      const prepared = selected.type.startsWith("image/")
        ? await compressImageFile(selected)
        : selected;
      await startExtraction({ kind: "file", file: prepared });
    } finally {
      setPreparingFile(false);
    }
  }

  if (extractedRecipe) {
    return (
      <main className="relative flex-1 flex flex-col items-center gap-4 px-5 py-8 bg-[#FAFAF7] dark:bg-stone-900">
        <div className="w-full max-w-3xl flex flex-col gap-4 animate-fade-in-up">
          <button
            type="button"
            onClick={resetExtraction}
            className="self-start flex items-center gap-1.5 text-sm font-medium text-[#4D7C0F] transition-colors hover:text-[#232920] dark:hover:text-stone-200"
          >
            <BackGlyph />
            {t.backToStart}
          </button>
          <RecipeCard recipe={extractedRecipe} onRecipeChange={setExtractedRecipe} />
        </div>
      </main>
    );
  }

  if (extractStatus === "loading" || preparingFile) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#FAFAF7] to-[#C4E484] dark:from-stone-900 dark:to-stone-800">
        <ExtractionProgress messages={t.extractingSteps} />
      </main>
    );
  }

  return (
    <main className="relative flex-1 flex flex-col items-center gap-5 px-5 py-8 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="animate-avocado-sway inline-flex">
            <AvocadoMark size={26} />
          </span>
          <span className="text-[21px] font-bold text-[#232920] dark:text-stone-50">
            {displayName ? t.homeHiUser(displayName) : t.title}
          </span>
        </div>
        <Link
          href="/profile"
          onClick={() => hapticTap()}
          aria-label={t.profileTitle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#5D6551] dark:text-stone-300 transition-colors hover:border-[#C4E484] dark:hover:border-stone-600"
        >
          <ProfileGlyph />
        </Link>
      </div>

      <HomeHero title={t.homeGreeting} subtitle={t.homeGreetingSub} />

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
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchGlyph />
          </span>
          <input
            type="search"
            value={homeQuery}
            onChange={(e) => setHomeQuery(e.target.value)}
            placeholder={t.homeSearchPlaceholder}
            className="w-full rounded-full border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-900 py-3.5 pl-11 pr-4 text-[15px] text-[#232920] dark:text-stone-100 placeholder-[var(--muted)] outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10"
          />
        </div>
        <p className="mt-2 px-1 text-xs leading-relaxed text-[var(--muted)]">{t.searchScoutTagline}</p>
      </form>

      <button
        type="button"
        onClick={() => {
          hapticTap();
          setUploadSheetOpen(true);
        }}
        className="flex w-full max-w-2xl items-center gap-3.5 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 px-5 py-3.5 text-left transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-700/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-700 dark:to-stone-700 dark:shadow-none text-[#3f6212] dark:text-stone-400">
          <ExtractGlyph />
        </span>
        <span className="flex-1 text-[15px] font-semibold text-[#232920] dark:text-stone-100">{t.homeStartExtract}</span>
        <Chevron />
      </button>

      {extractError && (
        <div className="w-full max-w-2xl rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-5 py-4">
          <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">{extractError}</p>
        </div>
      )}

      <AuthErrorBanner />

      <button
        type="button"
        onClick={() => {
          hapticTap();
          setGroceryOpen(true);
        }}
        className="flex w-full max-w-2xl items-center gap-3.5 rounded-2xl border border-[#E2E6D9] bg-white px-5 py-3.5 text-left transition-colors hover:bg-[#FCFCF9] dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-700 dark:to-stone-700 dark:shadow-none text-[#3f6212] dark:text-stone-400">
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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-700 dark:to-stone-700 dark:shadow-none text-[#3f6212] dark:text-stone-400">
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

      {/* A little extra breathing room above Recent instead of letting all
          the leftover vertical space (this is a short list, on a tall
          screen) pile up as dead space below it. */}
      <section className="mt-6 flex w-full max-w-2xl flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
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
          <p className="rounded-2xl border border-dashed border-[#E2E6D9] dark:border-stone-700 px-5 py-9 text-center text-sm text-[var(--muted)]">
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

      <UploadSourceSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onFile={handleHomeFile}
        photoAccept={PHOTO_ACCEPT_TYPES}
        fileAccept={DOCUMENT_ACCEPT_TYPES}
        t={t}
      />
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

function BackGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 19-7-7 7-7" />
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
