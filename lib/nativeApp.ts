import { Capacitor } from "@capacitor/core";

/** True only when running inside the Capacitor iOS shell — always false on
 *  the regular website, so every call site here is a no-op in the browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Hides the native splash screen once the first page has painted. Call once, client-side. */
export async function hideNativeSplashScreen() {
  if (!isNativeApp()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // Plugin not available (e.g. running the web build) — nothing to do.
  }
}

/** Matches the status bar to the app's own background instead of Capacitor's default. */
export async function configureNativeStatusBar() {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#fdf3ec" });
  } catch {
    // Plugin not available — nothing to do.
  }
}

/**
 * Handles avocato://share?url=<link> — what the iOS share extension opens
 * when someone shares a TikTok/YouTube link to Avocato. Navigates the
 * webview to /?url=<link>, where RecipeExtractor auto-starts extraction.
 * Covers both the warm case (app already running → appUrlOpen event) and
 * the cold case (app launched by the URL → getLaunchUrl).
 */
export async function registerNativeShareListener() {
  if (!isNativeApp()) return;
  try {
    const { App } = await import("@capacitor/app");

    function handle(openedUrl: string | undefined) {
      if (!openedUrl) return;
      try {
        const shared = new URL(openedUrl).searchParams.get("url");
        if (shared) window.location.href = `/?url=${encodeURIComponent(shared)}`;
      } catch {
        // Not a URL we understand — ignore.
      }
    }

    App.addListener("appUrlOpen", ({ url }) => handle(url));
    const launch = await App.getLaunchUrl();
    handle(launch?.url);
  } catch {
    // Plugin not available — share-sheet deep links just won't fire.
  }
}

const RECIPE_LINK_PATTERN =
  /^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|docs\.google\.com)\//i;

// Tracks the last clipboard value we already prompted about, so resuming
// the app repeatedly with the same link copied doesn't nag every time.
// Resets on a fresh app launch (module state), which is fine — a slightly
// stale prompt after a cold start is harmless.
let lastPromptedClipboardValue: string | null = null;

/**
 * Many apps (YouTube's iOS app most notably) use their own custom share
 * sheet instead of the system one, so our Share Extension never appears
 * there no matter how it's configured. Clipboard detection sidesteps that
 * entirely: works for any app whose "Copy link" a user taps, not just ones
 * that use the system share sheet. Never auto-submits — always requires a
 * tap, since silently acting on clipboard contents would be surprising.
 */
export async function checkClipboardForRecipeLink(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Clipboard } = await import("@capacitor/clipboard");
    const { value } = await Clipboard.read();
    const trimmed = value?.trim();
    if (!trimmed || !RECIPE_LINK_PATTERN.test(trimmed)) return null;
    if (trimmed === lastPromptedClipboardValue) return null;
    lastPromptedClipboardValue = trimmed;
    return trimmed;
  } catch {
    // Plugin not available, or the OS declined the read — skip silently.
    return null;
  }
}

/**
 * Re-checks the clipboard every time the app returns to the foreground —
 * exactly the moment right after someone copies a link in another app and
 * switches back to Avocato. Also checks once immediately for a cold start
 * right after copying.
 */
export async function registerClipboardWatcher(onDetect: (url: string) => void) {
  if (!isNativeApp()) return;
  try {
    const { App } = await import("@capacitor/app");

    async function check() {
      const url = await checkClipboardForRecipeLink();
      if (url) onDetect(url);
    }

    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) check();
    });
    check();
  } catch {
    // Plugin not available — clipboard detection just won't fire.
  }
}

/**
 * Cook Mode's screen-stays-awake guarantee. The web Wake Lock API
 * (wired in components/CookMode.tsx) works in Mobile Safari but is
 * unreliable inside a Capacitor WKWebView — this native plugin is the
 * reliable path when running as the app.
 */
export async function nativeKeepAwake(enable: boolean) {
  if (!isNativeApp()) return;
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    if (enable) await KeepAwake.keepAwake();
    else await KeepAwake.allowSleep();
  } catch {
    // Plugin not available — CookMode's Web Wake Lock fallback still applies.
  }
}
