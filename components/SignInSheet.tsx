"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { signInWithProvider } from "@/lib/auth";
import { AvocadoMark } from "@/lib/avocadoMark";
import { SITE_NAME } from "@/lib/siteConfig";
import type { Translation } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

/**
 * Full onboarding-style sign-in sheet — modeled on what competitor recipe
 * apps (Deglaze etc.) use: wordmark, one-line pitch, three buttons
 * (Google/Apple/email), terms footer. Kept as a sheet triggered from a
 * small corner icon rather than shown by default, since the product's
 * whole pitch is "usable with zero signup" — this is only for people who
 * actively want an account.
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
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState<"google" | "apple" | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (!open) return null;

  async function handleProvider(provider: "google" | "apple") {
    hapticTap();
    setOauthError(null);
    setOauthBusy(provider);
    const { error } = await signInWithProvider(provider);
    if (error) setOauthError(error);
    // On success the page navigates away (web) or the app hands off to
    // Safari (native) — no local "success" state to set either way.
    setOauthBusy(null);
  }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorDetail(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErrorDetail(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  function handleClose() {
    setShowEmail(false);
    setStatus("idle");
    setErrorDetail(null);
    setOauthError(null);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center" onClick={handleClose}>
      <div
        className="flex w-full flex-col gap-8 rounded-t-3xl bg-[#FAFAF7] dark:bg-stone-900 p-8 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:w-full sm:max-w-sm sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-800 dark:to-stone-800 dark:shadow-none">
              <AvocadoMark size={26} />
            </span>
            <span className="font-display italic text-2xl text-[#232920] dark:text-stone-50">{SITE_NAME}</span>
          </div>
          <button
            onClick={handleClose}
            aria-label={t.close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9AA093] transition-colors hover:bg-[#EDF1E4] hover:text-[#232920] dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            ✕
          </button>
        </div>

        {!showEmail ? (
          <>
            <p className="text-sm leading-relaxed text-[#5D6551] dark:text-stone-400">{t.signInTagline}</p>

            <div className="flex flex-col gap-3">
              <ProviderButton
                onClick={() => handleProvider("google")}
                busy={oauthBusy === "google"}
                icon={<GoogleIcon />}
                label={t.continueWithGoogle}
              />
              <ProviderButton
                onClick={() => handleProvider("apple")}
                busy={oauthBusy === "apple"}
                icon={<AppleIcon />}
                label={t.continueWithApple}
                dark
              />
              <ProviderButton
                onClick={() => {
                  hapticTap();
                  setShowEmail(true);
                }}
                icon={<EmailIcon />}
                label={t.continueWithEmail}
              />
            </div>

            {oauthError && (
              <p className="text-center text-xs text-red-600">{oauthError}</p>
            )}
          </>
        ) : (
          <form onSubmit={handleSendLink} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowEmail(false)}
              className="self-start text-xs font-medium text-[#4D7C0F] hover:text-[#232920] dark:text-lime-500 dark:hover:text-stone-100"
            >
              {t.backToOptions}
            </button>

            {status === "sent" ? (
              <p className="text-sm text-[#5D6551] dark:text-stone-400">{t.checkEmail}</p>
            ) : (
              <>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full rounded-xl border border-[#E2E6D9] bg-white px-4 py-3 text-sm text-[#30362B] placeholder-[#9AA093] outline-none focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder-stone-500"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {status === "sending" ? t.sending : t.sendLink}
                </button>
                {status === "error" && (
                  <p className="text-xs text-red-600">{errorDetail || t.genericAuthError}</p>
                )}
              </>
            )}
          </form>
        )}

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

function ProviderButton({
  onClick,
  icon,
  label,
  busy,
  dark,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  busy?: boolean;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-center gap-3 rounded-full border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
        dark
          ? "border-transparent bg-[#181C12] text-white hover:bg-[#2A3122] dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
          : "border-[#E2E6D9] bg-white text-[#30362B] hover:border-[#C0DC8C] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200 dark:hover:border-stone-500"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C39.1 37.6 44 32 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.54c-.03-2.8 2.3-4.15 2.4-4.22-1.3-1.9-3.33-2.17-4.06-2.2-1.72-.17-3.36 1.02-4.23 1.02-.88 0-2.22-1-3.65-.97-1.87.03-3.6 1.09-4.56 2.76-1.95 3.38-.5 8.38 1.4 11.12.93 1.34 2.03 2.85 3.48 2.8 1.4-.06 1.93-.9 3.62-.9 1.68 0 2.16.9 3.64.87 1.5-.02 2.46-1.36 3.38-2.71 1.06-1.55 1.5-3.06 1.52-3.14-.03-.01-2.92-1.12-2.95-4.43zM14.28 3.6c.77-.94 1.29-2.24 1.15-3.54-1.11.05-2.46.75-3.26 1.68-.72.82-1.35 2.15-1.18 3.4 1.24.1 2.5-.63 3.29-1.54z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}
