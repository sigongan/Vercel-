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
