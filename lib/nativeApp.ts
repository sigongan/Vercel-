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
    await StatusBar.setBackgroundColor({ color: "#FAFAF7" });
  } catch {
    // Plugin not available — nothing to do.
  }
}

const SHARED_URL_EVENT = "avocato:shared-url";

/**
 * Subscribes to links shared in while the app is already running (see the
 * warm-case branch of registerNativeShareListener below). Returns an
 * unsubscribe function. Used by RecipeExtractor to auto-start extraction
 * without a full page reload.
 */
export function onSharedUrl(callback: (url: string) => void): () => void {
  function listener(event: Event) {
    const detail = (event as CustomEvent<string>).detail;
    if (detail) callback(detail);
  }
  window.addEventListener(SHARED_URL_EVENT, listener as EventListener);
  return () => window.removeEventListener(SHARED_URL_EVENT, listener as EventListener);
}

/**
 * Handles every Universal Link (https://<domain>/...) that can open the app:
 * both the share extension's https://<domain>/?url=<link> and, more
 * generally, an OAuth provider (Google/Apple) redirecting back to
 * https://<domain>/auth/callback?code=... after signInWithGoogle/Apple opens
 * a system browser (see signInWithProvider in lib/auth.ts) — Safari can't
 * hand control back to an embedded WKWebView any other way. Covers both the
 * warm case (app already running → appUrlOpen event) and the cold case (app
 * launched by the URL → getLaunchUrl). Scheme-agnostic parsing, so this also
 * still handles the old avocato:// custom scheme if anything ever opens that
 * instead.
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

    // Any other in-app path a Universal Link can point at (currently just
    // /auth/callback) — the share link above is the one special case that
    // skips a reload for speed; everything else navigates for real.
    function otherPathFrom(openedUrl: string | undefined): string | null {
      if (!openedUrl) return null;
      try {
        const u = new URL(openedUrl);
        if (u.pathname === "/" && u.searchParams.has("url")) return null;
        return u.pathname === "/" ? null : `${u.pathname}${u.search}`;
      } catch {
        return null;
      }
    }

    async function closeInAppBrowser() {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch {
        // Nothing was open, or the plugin isn't available — fine either way.
      }
    }

    // Warm case (app already running, brought forward by a share): the
    // webview is already loaded, so a full window.location reload here
    // re-fetches the whole app over the network for no reason — visibly
    // slow/choppy compared to how snappy the rest of the app feels.
    // Dispatching an in-page event instead lets RecipeExtractor start
    // extraction immediately with no navigation at all. Every appUrlOpen
    // event is one genuine user action, so always fire it — never dedupe
    // here. Deduping this path by link value silently broke sharing the
    // same video twice in one app session ("worked once, then tapping
    // Avocato did nothing until the app was force-quit").
    App.addListener("appUrlOpen", ({ url }) => {
      const shared = sharedLinkFrom(url);
      if (shared) {
        window.dispatchEvent(new CustomEvent(SHARED_URL_EVENT, { detail: shared }));
        return;
      }
      const otherPath = otherPathFrom(url);
      if (otherPath) {
        closeInAppBrowser();
        window.location.href = otherPath;
      }
    });

    // Cold case (app launched by the share): the app is starting up from
    // nothing anyway, so a reload isn't extra cost here — and RecipeExtractor
    // reads ?url= on mount for this path. getLaunchUrl() keeps returning the
    // same launch URL on that fresh run — unguarded, that's an infinite
    // reload loop (app flashing open and shut). The guard lives ONLY on
    // this path; sessionStorage survives the reload and is cleared when the
    // app is fully killed, i.e. before any next cold launch.
    const launch = await App.getLaunchUrl();
    const shared = sharedLinkFrom(launch?.url);
    if (shared) {
      const key = `avocato:handled-launch:${shared}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.href = `/?url=${encodeURIComponent(shared)}`;
      }
      return;
    }
    const otherPath = otherPathFrom(launch?.url);
    if (otherPath) {
      const key = `avocato:handled-launch:${otherPath}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        await closeInAppBrowser();
        window.location.href = otherPath;
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
 * Opens the system share sheet with the recipe text. Native plugin inside
 * the app (reliable in WKWebView), Web Share API in browsers that have it,
 * and a clipboard copy as the last resort. Returns how it was delivered so
 * the button can show the right confirmation.
 */
export async function shareText(title: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (isNativeApp()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text });
      return "shared";
    } catch {
      // Plugin missing or user dismissed the sheet — fall through to web paths.
    }
  }
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch {
    // Dismissed or unsupported — fall through.
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Light tap feedback — button presses, tab switches, step navigation. */
export async function hapticTap() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Plugin not available — nothing to do.
  }
}

/** Success feedback — recipe ready, saved, timer done. */
export async function hapticSuccess() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Plugin not available — nothing to do.
  }
}

/** Error feedback — extraction failed. */
export async function hapticError() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    // Plugin not available — nothing to do.
  }
}

interface CookActivityState {
  recipeTitle: string;
  stepNumber: number;
  totalSteps: number;
  stepText: string;
  remainingSeconds: number;
  paused: boolean;
}

interface CookActivityPlugin {
  sync(state: CookActivityState): Promise<void>;
  end(): Promise<void>;
}

let cookActivityPlugin: CookActivityPlugin | null = null;

async function getCookActivityPlugin(): Promise<CookActivityPlugin> {
  if (!cookActivityPlugin) {
    const { registerPlugin } = await import("@capacitor/core");
    cookActivityPlugin = registerPlugin<CookActivityPlugin>("CookActivity");
  }
  return cookActivityPlugin;
}

/**
 * Mirrors a running Cook Mode step timer into an iOS Live Activity
 * (Dynamic Island + lock screen countdown), so the timer stays visible
 * with the phone locked or while checking another app mid-cooking.
 * Starts the activity on first call, updates it after; call on
 * start/pause/resume transitions only, not every tick — iOS animates the
 * running countdown itself from endDate. No-op until the CookTimerWidget
 * native setup is done (docs/ios-live-activities.md); the plugin call
 * just rejects and is swallowed.
 */
export async function syncCookTimerActivity(state: CookActivityState) {
  if (!isNativeApp()) return;
  try {
    await (await getCookActivityPlugin()).sync(state);
  } catch {
    // Plugin not registered in this build — Cook Mode works fine without it.
  }
}

/** Ends the Live Activity — timer finished, step left, or Cook Mode closed. */
export async function endCookTimerActivity() {
  if (!isNativeApp()) return;
  try {
    await (await getCookActivityPlugin()).end();
  } catch {
    // Plugin not registered in this build — nothing to end.
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
