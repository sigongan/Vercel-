"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";
import { isNativeApp } from "@/lib/nativeApp";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

interface Profile {
  email: string | null;
  credits: number;
  free_used_this_period: number;
  plan: string;
}

export function AuthPanel() {
  const { language } = useLanguage();
  const tRoot = translations[language];
  const t = tRoot.auth;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined = loading
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    // One server round trip (auth + profile together) instead of two
    // sequential Supabase calls from the browser.
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
      // INITIAL_SESSION fires immediately on mount — loadProfile() above
      // already covers it, so skip the duplicate request.
      if (event !== "INITIAL_SESSION") loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Fired by "Sign in to save" buttons elsewhere on the page.
    function openSignIn() {
      setExpanded(true);
    }
    window.addEventListener("avocato:open-signin", openSignIn);
    return () => window.removeEventListener("avocato:open-signin", openSignIn);
  }, []);

  if (!SUPABASE_CONFIGURED) return null;

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
      console.error("signInWithOtp failed", error);
      setErrorDetail(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorDetail(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("signInWithPassword failed", error);
      setErrorDetail(error.message);
      setStatus("error");
    } else {
      setStatus("idle");
    }
  }

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

  if (profile === undefined) {
    return <div className="h-8" />;
  }

  if (profile === null) {
    if (!expanded) {
      return (
        <button
          onClick={() => setExpanded(true)}
          aria-label={t.signInLink}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-900 dark:hover:text-stone-300"
        >
          <PersonIcon />
        </button>
      );
    }

    return (
      <form
        onSubmit={mode === "magic" ? handleSendLink : handlePasswordSignIn}
        className="flex max-w-[min(85vw,22rem)] flex-col items-end gap-2"
      >
        {status === "sent" ? (
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {t.checkEmail}
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-40 min-w-0 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400"
            />
            {mode === "password" && (
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-32 min-w-0 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400"
              />
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {status === "sending"
                ? t.sending
                : mode === "magic"
                  ? t.sendLink
                  : t.signInLink}
            </button>
          </div>
        )}
        {status !== "sent" && (
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "magic" ? "password" : "magic"));
              setStatus("idle");
              setErrorDetail(null);
            }}
            className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2"
          >
            {mode === "magic" ? t.usePasswordInstead : t.useMagicLinkInstead}
          </button>
        )}
        {status === "error" && (
          <span className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
            {errorDetail || t.genericAuthError}
          </span>
        )}
      </form>
    );
  }

  const freeRemaining = Math.max(
    0,
    FREE_MONTHLY_LIMIT - profile.free_used_this_period,
  );

  return (
    <div className="flex max-w-[min(90vw,26rem)] flex-wrap items-center justify-end gap-3 text-xs">
      <div className="flex flex-col items-end text-stone-500 dark:text-stone-400 leading-tight">
        <span>{profile.email}</span>
        <span>
          {freeRemaining > 0
            ? t.freeRemaining(freeRemaining)
            : t.credits(profile.credits)}
        </span>
      </div>
      {freeRemaining === 0 && !isNativeApp() && (
        <button
          onClick={handleBuyCredits}
          className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 font-medium whitespace-nowrap transition-colors"
        >
          {t.buyCredits}
        </button>
      )}
      <Link
        href="/recipes"
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium whitespace-nowrap shadow-sm transition-colors ${
          profile.plan === "pro"
            ? "bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            : "border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:border-amber-500"
        }`}
      >
        <BookmarkIcon />
        {profile.plan === "pro" ? tRoot.myRecipes : tRoot.myRecipesLocked}
      </Link>
      <button
        onClick={handleSignOut}
        className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2 whitespace-nowrap"
      >
        {t.signOut}
      </button>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
