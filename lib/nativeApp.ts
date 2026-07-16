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
 * Handles the Universal Link (https://<domain>/?url=<link>) the iOS share
 * extension opens when someone shares a TikTok/YouTube link to Avocato —
 * navigates the webview to /?url=<link>, where RecipeExtractor auto-starts
 * extraction. Covers both the warm case (app already running → appUrlOpen
 * event) and the cold case (app launched by the URL → getLaunchUrl). Scheme-
 * agnostic parsing, so this also still handles the old avocato:// custom
 * scheme if anything ever opens that instead.
 */
export async function registerNativeShareListener() {
  if (!isNativeApp()) return;
  try {
    const { App } = await import("@capacitor/app");

    function sharedLinkFrom(openedUrl: string | undefined): string | null {
      if (!openedUrl) return null;
      try {
        return new URL(openedUrl).searchParams.get("url");
      } catch {
        return null;
      }
    }

    function navigate(shared: string) {
      window.location.href = `/?url=${encodeURIComponent(shared)}`;
    }

    // Warm case (app already running, brought forward by a share): every
    // appUrlOpen event is one genuine user action, so always navigate —
    // never dedupe here. Deduping this path by link value silently broke
    // sharing the same video twice in one app session ("worked once, then
    // tapping Avocato did nothing until the app was force-quit").
    App.addListener("appUrlOpen", ({ url }) => {
      const shared = sharedLinkFrom(url);
      if (shared) navigate(shared);
    });

    // Cold case (app launched by the share): navigate() is a full reload
    // that re-runs this listener from scratch, and getLaunchUrl() keeps
    // returning the same launch URL on that fresh run — unguarded, that's
    // an infinite reload loop (app flashing open and shut). The guard
    // lives ONLY on this path; sessionStorage survives the reload and is
    // cleared when the app is fully killed, i.e. before any next
    // cold launch.
    const launch = await App.getLaunchUrl();
    const shared = sharedLinkFrom(launch?.url);
    if (shared) {
      const key = `avocato:handled-launch:${shared}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        navigate(shared);
      }
    }
  } catch {
    // Plugin not available — share-sheet deep links just won't fire.
  }
}

const RECIPE_LINK_PATTERN =
  /^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|docs\.google\.com)\//i;

// Tracks clipboard values we already prompted about (or already extracted
// via the share-sheet deep link, which also copies the link as its safety
// net), so resuming the app repeatedly with the same link copied doesn't
// nag every time. sessionStorage rather than module state because the
// deep-link navigation is a full reload — module state wouldn't survive it
// and the banner would pop up redundantly mid-extraction.
const PROMPTED_CLIPBOARD_KEY = "avocato:prompted-clipboard";

function alreadyPrompted(value: string): boolean {
  try {
    return sessionStorage.getItem(PROMPTED_CLIPBOARD_KEY) === value;
  } catch {
    return false;
  }
}

/** Marks a link as handled so the clipboard watcher won't re-offer it. */
export function suppressClipboardPrompt(value: string) {
  try {
    sessionStorage.setItem(PROMPTED_CLIPBOARD_KEY, value.trim());
  } catch {
    // Storage unavailable — worst case is a redundant banner.
  }
}

/**
 * Many apps (YouTube's iOS app most notably) use their own custom share
 * sheet instead of the system one, so our Share Extension never appears
 * there no matter how it's configured. Clipboard detection sidesteps that
 * entirely: works for any app whose "Copy link" a user taps, not just ones
 * that use the system share sheet. It's also the guaranteed fallback for
 * the share extension itself, which always copies the shared link before
 * attempting the (best-effort, sometimes flaky on iOS) app auto-open.
 * Never auto-submits — always requires a tap, since silently acting on
 * clipboard contents would be surprising.
 */
export async function checkClipboardForRecipeLink(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Clipboard } = await import("@capacitor/clipboard");
    const { value } = await Clipboard.read();
    const trimmed = value?.trim();
    if (!trimmed || !RECIPE_LINK_PATTERN.test(trimmed)) return null;
    if (alreadyPrompted(trimmed)) return null;
    suppressClipboardPrompt(trimmed);
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
