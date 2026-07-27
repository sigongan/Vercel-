"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";
import { hapticTap } from "@/lib/nativeApp";
import { SettingsFields, Chevron } from "@/components/SettingsFields";
import { getCachedMe, fetchMe, clearCachedMe } from "@/lib/meCache";
import type { MeResponse } from "@/lib/meCache";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

interface ProfileData {
  email: string | null;
  name: string | null;
  credits: number;
  free_used_this_period: number;
  plan: string;
}

export default function ProfilePage() {
  const { language } = useLanguage();
  const tRoot = translations[language];
  const t = tRoot.auth;

  function toProfileData(body: MeResponse): ProfileData {
    return {
      email: body.email ?? null,
      name: body.name ?? null,
      credits: body.credits ?? 0,
      free_used_this_period: body.free_used_this_period ?? 0,
      plan: body.plan ?? "free",
    };
  }

  // Starts undefined (loading skeleton) on both server and client so the
  // first client render always matches the server-rendered HTML — a
  // `typeof window` branch here used to read the session-cached profile
  // straight into the initial state, which matched SSR on a cold visit but
  // diverged on every later visit in the same session (skeleton on the
  // server, sign-in row or account row on the client), and React would
  // discard and rebuild the whole row on hydration. The effect below still
  // applies the cached value right after mount, before the network fetch
  // resolves, so returning visitors still see it almost immediately — just
  // one render tick later, post-hydration, not pre-.
  const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    async function loadProfile() {
      // Apply the session-cached profile first (before the network
      // round-trip below resolves) so a returning visitor sees it almost
      // immediately — safe here, post-hydration, unlike doing this in
      // useState's initializer.
      const cached = getCachedMe();
      if (cached) setProfile(cached.signedIn ? toProfileData(cached) : null);

      const body = await fetchMe();
      if (!body || !body.signedIn) {
        setProfile(null);
        return;
      }
      setProfile(toProfileData(body));
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
    hapticTap();
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    clearCachedMe();
    setProfile(null);
  }

  const freeRemaining = profile
    ? Math.max(0, FREE_MONTHLY_LIMIT - profile.free_used_this_period)
    : 0;

  const avatarLetter = profile?.name?.charAt(0) || profile?.email?.charAt(0) || "?";

  return (
    <main className="relative flex-1 flex flex-col items-center gap-4 px-5 py-8 pb-28 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="flex w-full max-w-2xl flex-col pb-1">
        <h1 className="text-[28px] font-bold tracking-tight text-[#232920] dark:text-stone-50">
          {tRoot.profileTitle}
        </h1>
      </div>

      {SUPABASE_CONFIGURED && (
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E2E6D9] bg-white divide-y divide-[#EDF1E4] dark:border-stone-700 dark:bg-stone-800 dark:divide-stone-700">
          {profile === undefined ? (
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-[#F1F4EA] dark:bg-stone-700" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-[#F1F4EA] dark:bg-stone-700" />
                <div className="h-3 w-24 animate-pulse rounded bg-[#F1F4EA]/70 dark:bg-stone-700/70" />
              </div>
            </div>
          ) : profile === null ? (
            <button
              type="button"
              onClick={() => {
                hapticTap();
                window.dispatchEvent(new Event("avocato:open-signin"));
              }}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FCFCF9] dark:hover:bg-stone-700/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F1F4EA] dark:bg-stone-700 text-[#9AA093]">
                <PersonIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[17px] font-semibold text-[#232920] dark:text-stone-50">
                  {tRoot.profileSignIn}
                </span>
                <span className="text-[13px] leading-snug text-[#9AA093]">
                  {tRoot.profileSignedOutSub}
                </span>
              </span>
              <Chevron />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-lg font-semibold uppercase text-white">
                  {avatarLetter}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[17px] font-semibold text-[#232920] dark:text-stone-50">
                    {profile.name || profile.email}
                  </span>
                  <span className="truncate text-[13px] text-[#9AA093]">
                    {profile.name ? `${profile.email} · ` : ""}
                    {freeRemaining > 0 ? t.freeRemaining(freeRemaining) : t.credits(profile.credits)}
                    {profile.plan === "pro" && " · Pro"}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full px-5 py-3.5 text-left text-[15px] text-red-500 transition-colors hover:bg-red-50/60 dark:hover:bg-red-950/20"
              >
                {t.signOut}
              </button>
            </>
          )}
        </div>
      )}

      <SettingsFields signedIn={Boolean(profile)} />
    </main>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}
