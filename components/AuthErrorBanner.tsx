"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { translations } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const t = translations.en;

function Banner() {
  const searchParams = useSearchParams();
  const hadAuthError = searchParams.get("authError") === "1";
  // Three states: not shown yet, confirmed-no-session (show it), or
  // confirmed-signed-in (never show it). Starting at false and flipping to
  // true after an async session check — the previous approach — flashed the
  // red banner for a beat on every successful sign-in, since "signed in" and
  // "sign-in failed" are mutually exclusive but the check to know which one
  // is true takes a moment. Waiting for the check before rendering anything
  // avoids the flash entirely.
  const [showAuthError, setShowAuthError] = useState(false);

  useEffect(() => {
    if (hadAuthError) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [hadAuthError]);

  useEffect(() => {
    if (!hadAuthError) return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && !data.session) setShowAuthError(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setShowAuthError(false);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hadAuthError]);

  if (!showAuthError) return null;

  return (
    <div className="relative z-[1] w-full max-w-2xl rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-5 py-4">
      <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{t.authLinkFailed}</p>
    </div>
  );
}

export function AuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
