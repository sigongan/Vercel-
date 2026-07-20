"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { SignInSheet } from "./SignInSheet";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Mounted once at the root so "Sign in to save" (RecipeCard), Profile's
 * sign-in button, and the once-per-install onboarding prompt (NativeAppInit)
 * all open the same sheet via one window event, regardless of which page
 * they're on — previously AuthPanel owned this, but it only existed on the
 * old single-page Home, so the event went nowhere from Library/Profile/etc.
 * once the bottom-tab-bar routes split the app up.
 */
export function SignInGate() {
  const { language } = useLanguage();
  const t = translations[language].auth;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    function openSignIn() {
      setOpen(true);
    }
    window.addEventListener("avocato:open-signin", openSignIn);
    return () => window.removeEventListener("avocato:open-signin", openSignIn);
  }, []);

  if (!SUPABASE_CONFIGURED) return null;

  return <SignInSheet open={open} onClose={() => setOpen(false)} t={t} />;
}
