"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { hapticTap, shareText } from "@/lib/nativeApp";
import { startProSubscription } from "@/lib/subscribePro";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";
import { SITE_URL } from "@/lib/siteConfig";
import { Chevron } from "@/components/SettingsFields";
import { GroceryListSheet } from "@/components/GroceryList";
import { getCachedMe, fetchMe } from "@/lib/meCache";
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
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState<string | null>(null);

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
  // first client render always matches the server-rendered HTML — see the
  // hydration note this replaced in git history for why reading the
  // session cache inside useState's initializer broke that.
  const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    async function loadProfile() {
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

  async function handleSubscribe() {
    hapticTap();
    setSubscribing(true);
    setSubscribeMsg(null);
    const outcome = await startProSubscription();
    if (outcome === "success") {
      window.location.reload();
      return;
    }
    if (outcome === "pending") setSubscribeMsg(tRoot.subscribePending);
    else if (outcome === "error" || outcome === "unavailable") setSubscribeMsg(tRoot.subscribeUnavailable);
    setSubscribing(false);
  }

  async function handleInviteFriends() {
    hapticTap();
    await shareText(tRoot.title, tRoot.inviteFriendsMessage(SITE_URL));
  }

  const freeRemaining = profile
    ? Math.max(0, FREE_MONTHLY_LIMIT - profile.free_used_this_period)
    : 0;

  const avatarLetter = profile?.name?.charAt(0) || profile?.email?.charAt(0) || "?";

  return (
    <main className="relative flex-1 flex flex-col items-center gap-6 px-5 py-8 bg-[#FAFAF7] dark:bg-stone-900">
      <div className="flex w-full max-w-2xl flex-col">
        <h1 className="text-[28px] font-bold tracking-tight text-[#232920] dark:text-stone-50">
          {tRoot.profileTitle}
        </h1>
      </div>

      {SUPABASE_CONFIGURED && (
        <div className="w-full max-w-2xl">
          {profile === undefined ? (
            <div className="flex items-center gap-4 py-2">
              <div className="h-14 w-14 animate-pulse rounded-full bg-[#F1F4EA] dark:bg-stone-700" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[#F1F4EA] dark:bg-stone-700" />
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
              className="flex w-full items-center gap-4 py-2 text-left"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F1F4EA] dark:bg-stone-700 text-[#9AA093]">
                <PersonIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[19px] font-semibold text-[#232920] dark:text-stone-50">
                  {tRoot.profileSignIn}
                </span>
                <span className="text-[13px] leading-snug text-[#9AA093]">
                  {tRoot.profileSignedOutSub}
                </span>
              </span>
              <Chevron />
            </button>
          ) : (
            <div className="flex w-full items-center gap-4 py-2">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-xl font-semibold uppercase text-white">
                {avatarLetter}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[19px] font-semibold text-[#232920] dark:text-stone-50">
                  {profile.name || profile.email}
                </span>
                <span className="truncate text-[13px] text-[#9AA093]">
                  {profile.name ? `${profile.email} · ` : ""}
                  {freeRemaining > 0 ? t.freeRemaining(freeRemaining) : t.credits(profile.credits)}
                  {profile.plan === "pro" && " · Pro"}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {profile && profile.plan !== "pro" && (
        <div className="flex w-full max-w-2xl items-center gap-4 rounded-2xl bg-[#EDECFB] dark:bg-stone-800 px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-bold text-[#4338CA] dark:text-indigo-300">
              {tRoot.profileProBanner}
            </span>
            <span className="truncate text-[12px] text-[#5B54B8] dark:text-indigo-400">{tRoot.subscribeCta}</span>
          </div>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={subscribing}
            className="shrink-0 rounded-full bg-[#4338CA] px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {tRoot.profileProBannerCta}
          </button>
        </div>
      )}
      {subscribeMsg && (
        <p className="w-full max-w-2xl px-1 text-xs text-[#9AA093]">{subscribeMsg}</p>
      )}

      <div className="flex w-full max-w-2xl flex-col">
        <ProfileRow href="/library?tab=saved" icon={<SavedIcon />} label={tRoot.librarySavedTab} />
        <ProfileRow href="/library?tab=wantToCook" icon={<HeartIcon />} label={tRoot.libraryWantToCookTab} />
        <ProfileRow
          icon={<CartIcon />}
          label={tRoot.groceryTitle}
          onClick={() => {
            hapticTap();
            setGroceryOpen(true);
          }}
        />
        <ProfileRow icon={<InviteIcon />} label={tRoot.inviteFriends} onClick={handleInviteFriends} />
        <ProfileRow href="/settings" icon={<SettingsIcon />} label={tRoot.settings.title} last />
      </div>

      {groceryOpen && (
        <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} t={tRoot} />
      )}
    </main>
  );
}

function ProfileRow({
  href,
  icon,
  label,
  onClick,
  last,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  last?: boolean;
}) {
  const className = `flex w-full items-center gap-4 py-3.5 text-left transition-colors hover:bg-[#F1F4EA]/40 dark:hover:bg-stone-800/60 ${
    last ? "" : "border-b border-[#EDF1E4] dark:border-stone-700"
  }`;
  const content = (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#232920] dark:text-stone-100">
        {icon}
      </span>
      <span className="flex-1 text-[16px] text-[#232920] dark:text-stone-100">{label}</span>
      <Chevron />
    </>
  );
  if (href) {
    return (
      <Link href={href} onClick={() => hapticTap()} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function SavedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
