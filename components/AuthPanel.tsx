"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { FREE_MONTHLY_LIMIT } from "@/lib/billingConstants";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined = loading
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const supabase = createSupabaseBrowserClient();

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("email, credits, free_used_this_period, plan")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(
        data ?? { email: user.email ?? null, credits: 0, free_used_this_period: 0, plan: "free" }
      );
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadProfile());

    return () => subscription.unsubscribe();
  }, []);

  if (!SUPABASE_CONFIGURED) return null;

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
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
          className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2 whitespace-nowrap"
        >
          {t.signInLink}
        </button>
      );
    }

    return (
      <form onSubmit={handleSendLink} className="flex items-center gap-2">
        {status === "sent" ? (
          <span className="text-xs text-stone-500 dark:text-stone-400">{t.checkEmail}</span>
        ) : (
          <>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-40 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-3 py-1.5 text-xs font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {status === "sending" ? t.sending : t.sendLink}
            </button>
          </>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">{t.genericAuthError}</span>
        )}
      </form>
    );
  }

  const freeRemaining = Math.max(0, FREE_MONTHLY_LIMIT - profile.free_used_this_period);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex flex-col items-end text-stone-500 dark:text-stone-400 leading-tight">
        <span>{profile.email}</span>
        <span>
          {freeRemaining > 0 ? t.freeRemaining(freeRemaining) : t.credits(profile.credits)}
        </span>
      </div>
      {freeRemaining === 0 && (
        <button
          onClick={handleBuyCredits}
          className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 font-medium whitespace-nowrap transition-colors"
        >
          {t.buyCredits}
        </button>
      )}
      <a
        href="/recipes"
        className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2 whitespace-nowrap"
      >
        {profile.plan === "pro" ? tRoot.myRecipes : tRoot.myRecipesLocked}
      </a>
      <button
        onClick={handleSignOut}
        className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2 whitespace-nowrap"
      >
        {t.signOut}
      </button>
    </div>
  );
}
