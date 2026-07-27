"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { translations, LANGUAGE_NAMES } from "@/lib/i18n";
import { hapticTap, isNativeApp, restorePurchases } from "@/lib/nativeApp";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearCachedMe } from "@/lib/meCache";

const CLEAR_KEYS = ["avocato:recent-recipes", "avocato:grocery-list", "avocato:recipe-notes"];

/**
 * Preferences / data / about rendered as flat grouped lists (a plain
 * uppercase-ish section label, then full-bleed rows with a hairline
 * bottom border — no card/box around them) — embedded on the /settings
 * page, which Profile links out to.
 */
export function SettingsFields({ signedIn = false }: { signedIn?: boolean }) {
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const t = translations[language].settings;
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    hapticTap();
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    clearCachedMe();
    window.location.href = "/profile";
  }

  async function handleDeleteAccount() {
    hapticTap();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed");
      }
      clearCachedMe();
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteError(t.deleteAccountError);
      setConfirmDelete(false);
      setDeleting(false);
    }
  }

  async function handleRestore() {
    hapticTap();
    setRestoring(true);
    setRestoreMsg(null);
    const outcome = await restorePurchases();
    if (outcome === "restored") {
      setRestoreMsg(t.restoreRestored);
      setTimeout(() => window.location.reload(), 800);
    } else {
      setRestoreMsg(t.restoreEmpty);
    }
    setRestoring(false);
  }

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
      <Section title={t.preferences}>
        <Link
          href="/language"
          onClick={() => hapticTap()}
          className="flex items-center justify-between border-b border-[#EDF1E4] py-3.5 transition-colors hover:bg-[#FCFCF9] dark:border-stone-700 dark:hover:bg-stone-700/40"
        >
          <span className="text-[15px] text-[#232920] dark:text-stone-100">{t.language}</span>
          <span className="flex items-center gap-1.5 text-[15px] text-[#9AA093]">
            {LANGUAGE_NAMES[language]}
            <Chevron />
          </span>
        </Link>
        <Row label={t.theme} last>
          <div className="flex items-center gap-3">
            <ThemeDot
              active={theme === "default"}
              label={t.themeDefault}
              swatch="linear-gradient(135deg, #C4E484, #8BC926)"
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
      </Section>

      <Section title={t.data}>
        <button
          type="button"
          onClick={handleClearData}
          className="w-full py-3.5 text-left text-[15px] text-red-500"
        >
          {cleared ? t.dataClearedConfirm : confirmClear ? t.dataClearConfirm : t.dataClear}
        </button>
      </Section>

      {isNativeApp() && (
        <Section title={t.purchasesSection}>
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="w-full py-3.5 text-left text-[15px] text-[#232920] disabled:opacity-60 dark:text-stone-100"
          >
            {restoreMsg ?? t.restorePurchases}
          </button>
        </Section>
      )}

      {signedIn && (
        <Section title={t.accountSection}>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full border-b border-[#EDF1E4] py-3.5 text-left text-[15px] text-[#232920] dark:border-stone-700 dark:text-stone-100"
          >
            {t.signOut}
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full py-3.5 text-left text-[15px] text-red-500 disabled:opacity-60"
          >
            {deleting ? t.deleteAccountWorking : confirmDelete ? t.deleteAccountConfirm : t.deleteAccount}
          </button>
          {deleteError && <p className="pb-3.5 text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
        </Section>
      )}

      <Section title={t.about}>
        <LinkRow href="/terms" label={t.terms} />
        <LinkRow href="/privacy" label={t.privacy} />
        <div className="flex items-center justify-between py-3.5">
          <span className="text-[15px] text-[#232920] dark:text-stone-100">{t.versionLabel}</span>
          <span className="text-[15px] text-[#9AA093]">1.0</span>
        </div>
      </Section>
    </>
  );
}

/** A plain section header label followed by full-bleed rows — no card/box,
 *  each row separated by its own bottom hairline (set by the row itself,
 *  since the last row in a section shouldn't draw one). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <h2 className="px-1 text-[13px] font-semibold text-[#232920] dark:text-stone-100">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-between gap-3 py-2.5 ${
        last ? "" : "border-b border-[#EDF1E4] dark:border-stone-700"
      }`}
    >
      <span className="text-[15px] text-[#232920] dark:text-stone-100">{label}</span>
      {children}
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-[#EDF1E4] py-3.5 transition-colors hover:bg-[#FCFCF9] dark:border-stone-700 dark:hover:bg-stone-700/40"
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
        active ? "ring-2 ring-offset-2 ring-[#8BC926] dark:ring-offset-stone-800" : "opacity-60 hover:opacity-90"
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
