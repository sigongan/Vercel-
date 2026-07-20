"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

const CLEAR_KEYS = ["avocato:recent-recipes", "avocato:grocery-list", "avocato:recipe-notes"];

/**
 * Language / theme / on-device-data / about sections — the actual settings
 * controls, with no modal chrome around them, so they can be embedded
 * directly on a page (Profile) rather than only inside a sheet.
 */
export function SettingsFields() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const t = translations[language].settings;
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  function handleClearData() {
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
    <div className="flex w-full flex-col gap-6">
      <Section label={t.language}>
        <SegmentedRow>
          <SegmentButton active={language === "en"} onClick={() => { hapticTap(); setLanguage("en"); }}>
            English
          </SegmentButton>
          <SegmentButton active={language === "ko"} onClick={() => { hapticTap(); setLanguage("ko"); }}>
            한국어
          </SegmentButton>
        </SegmentedRow>
      </Section>

      <Section label={t.theme}>
        <div className="flex gap-3">
          <ThemeSwatch
            active={theme === "default"}
            label={t.themeDefault}
            swatch="linear-gradient(135deg, #8BC926, #61A00E)"
            onClick={() => { hapticTap(); setTheme("default"); }}
          />
          <ThemeSwatch
            active={theme === "pink"}
            label={t.themePink}
            swatch="linear-gradient(135deg, #FFB6D9, #F472B6)"
            onClick={() => { hapticTap(); setTheme("pink"); }}
          />
          <ThemeSwatch
            active={theme === "dark"}
            label={t.themeDark}
            swatch="linear-gradient(135deg, #3a3f33, #181C12)"
            onClick={() => { hapticTap(); setTheme("dark"); }}
          />
        </div>
      </Section>

      <Section label={t.data}>
        <button
          type="button"
          onClick={handleClearData}
          className={`w-full rounded-full border px-5 py-3 text-sm font-medium transition-colors ${
            confirmClear
              ? "border-transparent bg-red-500 text-white hover:bg-red-600"
              : "border-[#E2E6D9] bg-white text-[#30362B] hover:border-[#C0DC8C] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200 dark:hover:border-stone-500"
          }`}
        >
          {cleared ? t.dataClearedConfirm : confirmClear ? t.dataClearConfirm : t.dataClear}
        </button>
      </Section>

      <Section label={t.about}>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/terms" className="text-[#4D7C0F] underline underline-offset-2 hover:text-[#232920] dark:text-lime-500 dark:hover:text-stone-100">
            {t.terms}
          </Link>
          <Link href="/privacy" className="text-[#4D7C0F] underline underline-offset-2 hover:text-[#232920] dark:text-lime-500 dark:hover:text-stone-100">
            {t.privacy}
          </Link>
        </p>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4D7C0F] dark:text-stone-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function SegmentedRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-full border border-[#E2E6D9] bg-white p-1 dark:border-stone-700 dark:bg-stone-950">
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white shadow-sm"
          : "text-[#5D6551] hover:text-[#232920] dark:text-stone-400 dark:hover:text-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

function ThemeSwatch({
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
    <button type="button" onClick={onClick} className="flex flex-1 flex-col items-center gap-2">
      <span
        style={{ background: swatch }}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
          active ? "ring-2 ring-offset-2 ring-[#61A00E] dark:ring-offset-stone-900" : "opacity-70"
        }`}
      >
        {active && <CheckIcon />}
      </span>
      <span className={`text-xs font-medium ${active ? "text-[#232920] dark:text-stone-100" : "text-[#9AA093]"}`}>
        {label}
      </span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
