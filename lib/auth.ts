"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isNativeApp, nativeAppleSignIn } from "@/lib/nativeApp";
import type { NativeSignInResult } from "@/lib/nativeApp";

// Apple-only by design: the product ships Apple-ecosystem-first, so one
// great native option beats a menu of providers. (Google/email sign-in were
// removed with the rest of their UI; Android will get its own treatment.)
export type OAuthProvider = "apple";

/**
 * Starts Apple sign-in.
 *
 * On the plain website, Supabase's default behavior (a normal browser
 * redirect to Apple, then back to /auth/callback) just works.
 *
 * Inside the Capacitor app, the primary path is fully native — the system
 * "Sign in with Apple" Face ID sheet presented by
 * native/App/AppleSignInPlugin.swift, no browser and no visible URLs, same
 * as every polished app. The plugin hands back an Apple-signed identity
 * token and signInWithIdToken turns it into a Supabase session right in the
 * webview (cookie-based, so the server sees it immediately).
 *
 * If the plugin isn't in this build (older install), it falls back to the
 * previous flow: open Supabase's provider URL in the system browser and
 * return via the avocato:// scheme (see registerNativeShareListener in
 * lib/nativeApp.ts).
 */
export async function signInWithProvider(
  provider: OAuthProvider,
): Promise<{ error: string | null; signedIn?: boolean }> {
  const supabase = createSupabaseBrowserClient();

  if (isNativeApp()) {
    const native = await nativeAppleSignIn();
    if (native.status === "cancelled") return { error: null };
    if (native.status === "success") return finishNativeSignIn(supabase, provider, native);
    if (native.status === "error") return { error: native.message };
    // "unavailable" → browser fallback below.
    return signInViaBrowser(supabase, provider);
  }

  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return { error: error?.message ?? null };
}

async function finishNativeSignIn(
  supabase: SupabaseClient,
  provider: OAuthProvider,
  native: Extract<NativeSignInResult, { status: "success" }>,
): Promise<{ error: string | null; signedIn?: boolean }> {
  const { error } = await supabase.auth.signInWithIdToken({
    provider,
    token: native.token,
    // Raw nonce whose SHA-256 is embedded in the token — Supabase hashes and
    // compares it as replay protection.
    ...(native.nonce ? { nonce: native.nonce } : {}),
  });
  if (error) return { error: error.message };

  // Apple only reveals the name on the very first authorization — store it
  // so "Hi, {name}" (user_metadata.full_name via /api/me) works.
  // Best-effort: a signed-in session matters more.
  if (native.fullName) {
    try {
      await supabase.auth.updateUser({ data: { full_name: native.fullName } });
    } catch {
      // Ignore — the session is already established.
    }
  }

  // No page reload — signInWithIdToken already set the session cookie, and
  // it fires a Supabase onAuthStateChange event that every screen showing
  // sign-in-dependent state (Home, Profile) listens for and refreshes from
  // in place. A full reload here was the earlier, clunkier approach: it
  // re-fetched the whole app over the network, which read as a stall right
  // as the Face ID sheet was closing.
  return { error: null, signedIn: true };
}

/**
 * Fallback for native builds without the sign-in plugin: Supabase's
 * provider URL in the system browser (WKWebView OAuth is refused by Apple —
 * disallowed_useragent), returning via the avocato:// custom scheme, which
 * iOS hands off from the URL Type in Info.plist with no Apple-side domain
 * validation to go stale the way Universal Links did.
 */
async function signInViaBrowser(
  supabase: SupabaseClient,
  provider: OAuthProvider,
): Promise<{ error: string | null }> {
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
