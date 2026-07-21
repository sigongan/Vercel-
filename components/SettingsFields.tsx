"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { translations, LANGUAGE_NAMES } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

const CLEAR_KEYS = ["avocato:recent-recipes", "avocato:grocery-list", "avocato:recipe-notes"];

/**
 * Preferences / data / about rendered as iOS-Settings-style grouped inset
 * lists (rows in white cards, hairline separators, controls right-aligned)
 * — embedded directly on the Profile page below the account card.
 */
export function SettingsFields() {
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const t = translations[language].settings;
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  function handleClearData() {
    hapticTap();
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    for (const key of CLEAR_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage unavailable — nothing to clear.
      }
    }
    setConfirmClear(false);
    setCleared(true);
    // The recent/grocery/notes stores use useSyncExternalStore keyed off
    // their own storage-event listeners, which don't fire for same-tab
    // writes — a reload is the simplest way to make every open view agree
    // the data is gone, rather than wiring a change event per store.
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <>
      <Group>
        <Link
          href="/language"
          onClick={() => hapticTap()}
          className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-800/40"
        >
          <span className="text-[15px] text-[#232920] dark:text-stone-100">{t.language}</span>
          <span className="flex items-center gap-1.5 text-[15px] text-[#9AA093]">
            {LANGUAGE_NAMES[language]}
            <Chevron />
          </span>
        </Link>
        <Row label={t.theme}>
          <div className="flex items-center gap-3">
            <ThemeDot
              active={theme === "default"}
              label={t.themeDefault}
              swatch="linear-gradient(135deg, #8BC926, #61A00E)"
              onClick={() => { hapticTap(); setTheme("default"); }}
            />
            <ThemeDot
              active={theme === "pink"}
              label={t.themePink}
              swatch="linear-gradient(135deg, #FFB6D9, #F472B6)"
              onClick={() => { hapticTap(); setTheme("pink"); }}
            />
            <ThemeDot
              active={theme === "dark"}
              label={t.themeDark}
              swatch="linear-gradient(135deg, #3a3f33, #181C12)"
              onClick={() => { hapticTap(); setTheme("dark"); }}
            />
          </div>
        </Row>
      </Group>

      <Group>
        <button
          type="button"
          onClick={handleClearData}
          className="w-full px-5 py-3.5 text-left text-[15px] text-red-500 transition-colors hover:bg-red-50/60 dark:hover:bg-red-950/20"
        >
          {cleared ? t.dataClearedConfirm : confirmClear ? t.dataClearConfirm : t.dataClear}
        </button>
      </Group>

      <Group>
        <LinkRow href="/terms" label={t.terms} />
        <LinkRow href="/privacy" label={t.privacy} />
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[15px] text-[#232920] dark:text-stone-100">Version</span>
          <span className="text-[15px] text-[#9AA093]">1.0</span>
        </div>
      </Group>
    </>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E2E6D9] bg-white divide-y divide-[#EDF1E4] dark:border-stone-800 dark:bg-stone-900 dark:divide-stone-800">
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-2.5">
      <span className="text-[15px] text-[#232920] dark:text-stone-100">{label}</span>
      {children}
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-800/40"
    >
      <span className="text-[15px] text-[#232920] dark:text-stone-100">{label}</span>
      <Chevron />
    </Link>
  );
}

function ThemeDot({
  active,
  label,
  swatch,
  onClick,
}: {
  active: boolean;
  label: string;
  swatch: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      style={{ background: swatch }}
      className={`h-7 w-7 rounded-full transition-all ${
        active ? "ring-2 ring-offset-2 ring-[#61A00E] dark:ring-offset-stone-900" : "opacity-60 hover:opacity-90"
      }`}
    />
  );
}

export function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#CDD4C2] dark:text-stone-600">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
