"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

const TABS = [
  { href: "/", match: (p: string) => p === "/", icon: HomeIcon, labelKey: "tabBarHome" as const },
  { href: "/search", match: (p: string) => p.startsWith("/search"), icon: SearchIcon, labelKey: "tabBarSearch" as const },
  { href: "/extract", match: (p: string) => p.startsWith("/extract"), icon: ExtractIcon, labelKey: "tabBarExtract" as const },
  { href: "/library", match: (p: string) => p.startsWith("/library") || p.startsWith("/recipes"), icon: LibraryIcon, labelKey: "tabBarLibrary" as const },
  { href: "/profile", match: (p: string) => p.startsWith("/profile"), icon: ProfileIcon, labelKey: "tabBarProfile" as const },
];

/**
 * Persistent bottom navigation across the five main sections. Fixed, so
 * every page under it needs bottom padding (see the pb-28 wrapper in each
 * page) to keep content from being covered.
 */
export function BottomTabBar() {
  const { language } = useLanguage();
  const t = translations[language];
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E6D9] bg-[#FAFAF7]/95 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 pb-[env(safe-area-inset-bottom)]"
      aria-label={t.tabBarNav}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map(({ href, match, icon: Icon, labelKey }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => hapticTap()}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors duration-300 ${
                active
                  ? "text-[#61A00E] dark:text-lime-500"
                  : "text-[#9AA093] hover:text-[#5D6551] dark:hover:text-stone-400"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ease-out ${
                  active ? "scale-100 bg-[#F2F7E8] dark:bg-stone-700" : "scale-90 bg-transparent"
                }`}
              >
                <Icon active={active} />
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

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function SearchIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LibraryIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ExtractIcon({ active }: IconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}
