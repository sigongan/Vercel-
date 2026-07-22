"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { translations } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const t = translations.en;

function Banner() {
  const searchParams = useSearchParams();
  const [showAuthError, setShowAuthError] = useState(() => searchParams.get("authError") === "1");

  useEffect(() => {
    if (searchParams.get("authError") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);

  // Being signed in and "sign-in failed" can't both be true — if a session
  // already exists by the time this mounts (a retry succeeded without a
  // reload, or the query param survived from a much earlier attempt via
  // WKWebView's page-state restoration on cold launch), hide the banner
  // rather than showing a contradictory error next to "Hi, {name}".
  useEffect(() => {
    if (!showAuthError) return;
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setShowAuthError(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setShowAuthError(false);
    });
    return () => subscription.unsubscribe();
  }, [showAuthError]);

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
