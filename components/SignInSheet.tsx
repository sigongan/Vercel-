"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signInWithProvider } from "@/lib/auth";
import { AvocadoMark } from "@/lib/avocadoMark";
import { SITE_NAME } from "@/lib/siteConfig";
import type { Translation } from "@/lib/i18n";
import { hapticTap, hapticSuccess } from "@/lib/nativeApp";

/**
 * Onboarding-style sign-in sheet: wordmark, one-line pitch, a single
 * "Continue with Apple" button, terms footer. Apple-only by design — the
 * product ships Apple-ecosystem-first, and one great native option beats a
 * menu of providers (Google/email were removed; Android will get its own
 * treatment later). Kept as a sheet triggered on demand rather than shown
 * at launch, since the product's whole pitch is "usable with zero signup" —
 * this appears only when someone does something that needs an account.
 */
export function SignInSheet({
  open,
  onClose,
  t,
}: {
  open: boolean;
  onClose: () => void;
  t: Translation["auth"];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleApple() {
    hapticTap();
    setError(null);
    setBusy(true);
    const { error, signedIn } = await signInWithProvider("apple");
    if (signedIn) {
      // Native path: session is already set, no reload needed — just close
      // the sheet. (Web path never reaches here — it navigates to Apple.)
      hapticSuccess();
      handleClose();
      setBusy(false);
      return;
    }
    if (error) setError(error);
    setBusy(false);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center" onClick={handleClose}>
      <div
        className="flex w-full flex-col gap-8 rounded-t-3xl bg-[#FAFAF7] dark:bg-stone-800 p-8 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:w-full sm:max-w-sm sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-700 dark:to-stone-700 dark:shadow-none">
              <AvocadoMark size={26} />
            </span>
            <span className="font-display italic text-2xl text-[#232920] dark:text-stone-50">{SITE_NAME}</span>
          </div>
          <button
            onClick={handleClose}
            aria-label={t.close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9AA093] transition-colors hover:bg-[#EDF1E4] hover:text-[#232920] dark:hover:bg-stone-700 dark:hover:text-stone-100"
          >
            ✕
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[#5D6551] dark:text-stone-400">{t.signInTagline}</p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleApple}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-transparent bg-[#181C12] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2A3122] disabled:opacity-60 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <AppleIcon />
            </span>
            {t.continueWithApple}
          </button>
          {error && <p className="text-center text-xs text-red-600">{error}</p>}
        </div>

        <p className="text-center text-[11px] leading-relaxed text-[#9AA093]">
          {t.agreeToTerms("__TERMS__", "__PRIVACY__")
            .split(/(__TERMS__|__PRIVACY__)/)
            .map((part, i) =>
              part === "__TERMS__" ? (
                <Link key={i} href="/terms" className="underline underline-offset-2 hover:text-[#232920] dark:hover:text-stone-200">
                  {t.termsOfService}
                </Link>
              ) : part === "__PRIVACY__" ? (
                <Link key={i} href="/privacy" className="underline underline-offset-2 hover:text-[#232920] dark:hover:text-stone-200">
                  {t.privacyPolicy}
                </Link>
              ) : (
                part
              ),
            )}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.54c-.03-2.8 2.3-4.15 2.4-4.22-1.3-1.9-3.33-2.17-4.06-2.2-1.72-.17-3.36 1.02-4.23 1.02-.88 0-2.22-1-3.65-.97-1.87.03-3.6 1.09-4.56 2.76-1.95 3.38-.5 8.38 1.4 11.12.93 1.34 2.03 2.85 3.48 2.8 1.4-.06 1.93-.9 3.62-.9 1.68 0 2.16.9 3.64.87 1.5-.02 2.46-1.36 3.38-2.71 1.06-1.55 1.5-3.06 1.52-3.14-.03-.01-2.92-1.12-2.95-4.43zM14.28 3.6c.77-.94 1.29-2.24 1.15-3.54-1.11.05-2.46.75-3.26 1.68-.72.82-1.35 2.15-1.18 3.4 1.24.1 2.5-.63 3.29-1.54z" />
    </svg>
  );
}
