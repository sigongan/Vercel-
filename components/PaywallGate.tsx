"use client";

import { useState } from "react";
import { SUBSCRIPTION_PRICE_USD } from "@/lib/billingConstants";
import { isNativeApp } from "@/lib/nativeApp";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

/**
 * Blurs its children and overlays a subscribe CTA when locked.
 * Note: the blur is presentation-only — the content is still in the DOM.
 * Use it for tools/UI, not for withholding genuinely secret data.
 */
export function PaywallGate({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  const { language } = useLanguage();
  const t = translations[language];
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const native = isNativeApp();

  if (!locked) return <>{children}</>;

  async function handleSubscribe() {
    setError(null);
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Subscriptions aren't available yet. Please try again later.");
    } catch {
      setError("Subscriptions aren't available yet. Please try again later.");
    }
    setRedirecting(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-md" aria-hidden>
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/70 dark:bg-stone-950/70 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
          <LockIcon />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-stone-900 dark:text-stone-50">
            Unlock Chef&apos;s Technical Tips &amp; Margin Calculator
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm">
            Cost every dish, set your target GP%, and price with GST included — plus save unlimited
            recipes to your library.
          </p>
        </div>
        {native ? (
          // Apple bars linking to external purchase flows from inside the
          // native app (Guideline 3.1.1) — no Stripe redirect here.
          <p className="text-xs text-stone-500 dark:text-stone-400">{t.manageOnWeb}</p>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={redirecting}
            className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            {redirecting ? "Redirecting…" : `Subscribe Now — $${SUBSCRIPTION_PRICE_USD}/month`}
          </button>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
