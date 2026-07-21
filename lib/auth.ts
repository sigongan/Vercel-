"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isNativeApp } from "@/lib/nativeApp";

export type OAuthProvider = "google" | "apple";

/**
 * Starts Google/Apple sign-in.
 *
 * On the plain website, Supabase's default behavior (a normal browser
 * redirect to the provider, then back to /auth/callback) just works.
 *
 * Inside the Capacitor app there's no "the browser" to redirect — it's a
 * sandboxed WKWebView, and both Google and Apple refuse to complete OAuth
 * inside an embedded webview at all (Google returns disallowed_useragent).
 * So here we ask Supabase for the provider URL without auto-redirecting
 * (skipBrowserRedirect), open it in the system browser via @capacitor/browser
 * (a real Safari view, which Google/Apple accept), and point Supabase's
 * final redirect at the app's own avocato:// custom scheme rather than an
 * https:// Universal Link — Universal Links depend on Apple re-validating
 * apple-app-site-association against the app's Associated Domains
 * entitlement, which in practice was slow/unreliable to pick up. A
 * registered URL scheme hands off to the app immediately with no such
 * validation. When the browser lands on it, iOS hands control back to the
 * app (see registerNativeShareListener / otherPathFrom in lib/nativeApp.ts),
 * which finishes the same way a magic link does at app/auth/callback/route.ts.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient();

  if (!isNativeApp()) {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    return { error: error?.message ?? null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: "avocato://auth-callback", skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: error?.message ?? "Could not start sign-in." };
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url });
    return { error: null };
  } catch {
    return { error: "Could not open the sign-in page." };
  }
}
