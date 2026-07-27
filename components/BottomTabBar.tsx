"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";
import { getCachedMe } from "@/lib/meCache";

const TABS = [
  { href: "/", match: (p: string) => p === "/", icon: HomeIcon, labelKey: "tabBarHome" as const },
  { href: "/search", match: (p: string) => p.startsWith("/search"), icon: SearchIcon, labelKey: "tabBarSearch" as const },
  { href: "/extract", match: (p: string) => p.startsWith("/extract"), icon: ExtractIcon, labelKey: "tabBarExtract" as const },
  { href: "/library", match: (p: string) => p.startsWith("/library") || p.startsWith("/recipes"), icon: LibraryIcon, labelKey: "tabBarLibrary" as const },
  { href: "/profile", match: (p: string) => p.startsWith("/profile"), icon: ProfileIcon, labelKey: "tabBarProfile" as const },
];

/**
 * Persistent bottom navigation across the five main sections. `sticky`, not
 * `fixed` — it's a normal flex child at the end of the page (see
 * app/layout.tsx), so it already occupies its own space and pages don't
 * need bottom padding to keep content from being covered.
 */
export function BottomTabBar() {
  const { language } = useLanguage();
  const t = translations[language];
  const pathname = usePathname();

  // Sign in with Apple never hands over a photo (Apple doesn't expose one,
  // unlike Google) — this is a colored initial, the same avatar used on
  // the Profile page and nowhere close to an actual picture. Starts null
  // (matches SSR) and applies the session cache post-mount, same
  // hydration-safe shape as Profile/Home's own account state.
  const [avatarLetter, setAvatarLetter] = useState<string | null>(null);
  useEffect(() => {
    function applyFromCache() {
      const cached = getCachedMe();
      if (cached?.signedIn) {
        const letter = cached.name?.charAt(0) || cached.email?.charAt(0) || null;
        if (letter) setAvatarLetter(letter);
      } else {
        setAvatarLetter(null);
      }
    }
    applyFromCache();
    window.addEventListener("storage", applyFromCache);
    return () => window.removeEventListener("storage", applyFromCache);
  }, []);

  return (
    // `sticky` instead of `fixed`: iOS WebKit repaints `fixed` elements a
    // frame or two late during momentum scrolling, which reads as the bar
    // bouncing/lagging behind the content. `sticky bottom-0` on the last
    // flex child of the page (see app/layout.tsx) pins to the same visual
    // spot without that repaint, since the browser tracks it as part of
    // normal layout/scroll instead of a separately-composited overlay.
    <nav
      className="sticky bottom-0 z-40 w-full shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2"
      aria-label={t.tabBarNav}
    >
      {/* Floating capsule, not an edge-to-edge bar — margin on every side so
          it reads as a card sitting on top of the page rather than a strip
          fused to the screen edge. */}
      <div className="mx-auto flex max-w-2xl items-stretch justify-around rounded-[28px] border border-[#E2E6D9] bg-[#FAFAF7]/95 backdrop-blur shadow-[0_8px_20px_rgba(97,160,14,0.35)] dark:border-stone-700 dark:bg-stone-900/95 dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        {TABS.map(({ href, match, icon: Icon, labelKey }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => hapticTap()}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-[color] duration-200 ease-out active:scale-90 [transition-property:color,transform] ${
                active
                  ? "text-[#61A00E] dark:text-lime-500"
                  : "text-[#9AA093] hover:text-[#5D6551] dark:hover:text-stone-400"
              }`}
            >
              {/* Active state is colour + the pill behind the icon only.
                  The icon itself never changes size: this bar is the one
                  fixed thing on screen, and an icon that grew/shrank on every
                  tab change made the whole bottom of the app look unsettled.
                  The pill lives on its own absolutely-positioned layer behind
                  the icon so it can pop in with a spring-ish scale+fade
                  without touching the icon's size. */}
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-[#F2F7E8] dark:bg-stone-700 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                    active ? "scale-100 opacity-100" : "scale-75 opacity-0"
                  }`}
                />
                <span className="relative">
                  {href === "/profile" && avatarLetter ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-[11px] font-semibold uppercase text-white">
                      {avatarLetter}
                    </span>
                  ) : (
                    <Icon active={active} />
                  )}
                </span>
              </span>
              {t[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { active: boolean };

// One size for every tab icon, active or not. Stroke weight is fixed too —
// a heavier stroke on the selected tab reads as a size change even though
// the box stays put.
const ICON_SIZE = 22;
const STROKE = 1.8;

function HomeIcon({ active }: IconProps) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LibraryIcon({ active }: IconProps) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ExtractIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}
