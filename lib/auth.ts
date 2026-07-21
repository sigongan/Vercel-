"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isNativeApp, nativeAppleSignIn, nativeGoogleSignIn } from "@/lib/nativeApp";
import type { NativeSignInResult } from "@/lib/nativeApp";

export type OAuthProvider = "google" | "apple";

// iOS-type OAuth client from Google Cloud (not the web one) — public by
// nature, needed client-side to open Google's native account sheet.
const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Starts Google/Apple sign-in.
 *
 * On the plain website, Supabase's default behavior (a normal browser
 * redirect to the provider, then back to /auth/callback) just works.
 *
 * Inside the Capacitor app, the primary path is fully native — the system
 * "Sign in with Apple" Face ID sheet or Google's account sheet presented by
 * the Swift plugins in native/App/, no browser and no visible URLs, same as
 * every polished app. The plugin hands back a provider-signed ID token and
 * signInWithIdToken turns it into a Supabase session right here in the
 * webview (cookie-based, so the server sees it immediately).
 *
 * If the native plugin isn't in this build (older install, or the Google
 * SDK steps in docs/ios-native-signin.md not done yet), it falls back to
 * the previous flow: open Supabase's provider URL in the system browser and
 * return via the avocato:// scheme (see registerNativeShareListener in
 * lib/nativeApp.ts).
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient();

  if (isNativeApp()) {
    const native =
      provider === "apple" ? await nativeAppleSignIn() : await nativeGoogleSignIn(GOOGLE_IOS_CLIENT_ID);

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
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithIdToken({
    provider,
    token: native.token,
    // Apple: raw nonce whose SHA-256 is embedded in the token. Google's iOS
    // SDK doesn't support nonces — the Supabase Google provider has "Skip
    // nonce checks" enabled for exactly this case.
    ...(native.nonce ? { nonce: native.nonce } : {}),
  });
  if (error) return { error: error.message };

  // Apple only reveals the name on the very first authorization, and Google's
  // may not be in the token — store it so "Hi, {name}" (user_metadata.full_name
  // via /api/me) works. Best-effort: a signed-in session matters more.
  if (native.fullName) {
    try {
      await supabase.auth.updateUser({ data: { full_name: native.fullName } });
    } catch {
      // Ignore — the session is already established.
    }
  }

  // Cookie is set; reload so every server-rendered surface picks it up (same
  // end state the redirect flows reach via /auth/callback).
  window.location.reload();
  return { error: null };
}

/**
 * Fallback for native builds without the sign-in plugins: Supabase's
 * provider URL in the system browser (WKWebView OAuth is refused by both
 * Google and Apple — disallowed_useragent), returning via the avocato://
 * custom scheme, which iOS hands off from the URL Type in Info.plist with
 * no Apple-side domain validation to go stale the way Universal Links did.
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
