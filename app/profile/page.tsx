"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";
import { isNativeApp, hapticTap } from "@/lib/nativeApp";
import { SettingsFields } from "@/components/SettingsFields";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

interface ProfileData {
  email: string | null;
  credits: number;
  free_used_this_period: number;
  plan: string;
}

export default function ProfilePage() {
  const { language } = useLanguage();
  const tRoot = translations[language];
  const t = tRoot.auth;

  const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    async function loadProfile() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const body = await res.json();
        if (!body.signedIn) {
          setProfile(null);
          return;
        }
        setProfile({
          email: body.email ?? null,
          credits: body.credits ?? 0,
          free_used_this_period: body.free_used_this_period ?? 0,
          plan: body.plan ?? "free",
        });
      } catch {
        setProfile(null);
      }
    }

    loadProfile();

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "INITIAL_SESSION") loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function handleBuyCredits() {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  const freeRemaining = profile
    ? Math.max(0, FREE_MONTHLY_LIMIT - profile.free_used_this_period)
    : 0;

  return (
    <main className="relative flex-1 flex flex-col items-center gap-8 px-5 py-10 pb-28 bg-gradient-to-b from-[#FAFAF7] via-[#F4F6EE] to-[#FAFAF7] dark:bg-stone-950 dark:from-transparent dark:via-transparent dark:to-transparent">
      <div className="flex w-full max-w-2xl flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[#232920] dark:text-stone-50">{tRoot.profileTitle}</h1>
      </div>

      {SUPABASE_CONFIGURED && (
        <div className="w-full max-w-2xl rounded-2xl border border-[#E2E6D9] dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none">
          {profile === undefined ? (
            <div className="h-14 animate-pulse rounded-xl bg-[#F1F4EA] dark:bg-stone-800" />
          ) : profile === null ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F7E8] dark:bg-stone-800 text-[#9AA093]">
                <PersonIcon />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[#232920] dark:text-stone-100">
                  {tRoot.profileSignedOutTitle}
                </p>
                <p className="text-sm text-[#6B7261] dark:text-stone-400 max-w-xs">
                  {tRoot.profileSignedOutSub}
                </p>
              </div>
              <button
                onClick={() => {
                  hapticTap();
                  window.dispatchEvent(new Event("avocato:open-signin"));
                }}
                className="mt-1 rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
              >
                {tRoot.profileSignIn}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] dark:from-stone-800 dark:to-stone-800 text-[#4D7C0F] dark:text-stone-300">
                  <PersonIcon />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-[#232920] dark:text-stone-100">
                    {profile.email}
                  </span>
                  <span className="text-xs text-[#9AA093]">
                    {freeRemaining > 0 ? t.freeRemaining(freeRemaining) : t.credits(profile.credits)}
                    {profile.plan === "pro" && ` · ${tRoot.myRecipes}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {freeRemaining === 0 && !isNativeApp() && (
                  <button
                    onClick={handleBuyCredits}
                    className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
                  >
                    {t.buyCredits}
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="rounded-full border border-[#E2E6D9] dark:border-stone-700 px-4 py-2 text-xs font-medium text-[#6B7261] dark:text-stone-400 transition-colors hover:border-[#C0DC8C] hover:text-[#232920] dark:hover:text-stone-200"
                >
                  {t.signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-2xl rounded-2xl border border-[#E2E6D9] dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-[0_4px_14px_rgba(105,150,55,0.08)] dark:shadow-none">
        <SettingsFields />
      </div>
    </main>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}
