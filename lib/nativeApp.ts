import { Capacitor } from "@capacitor/core";

/** True only when running inside the Capacitor iOS shell — always false on
 *  the regular website, so every call site here is a no-op in the browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Tells the native shell's animated splash (AnimatedSplashView, shown from
 * the very first frame while the remote web app loads) that the page has
 * rendered and it can fade out. No-op on the website and in native builds
 * that haven't installed the splash files yet.
 */
export async function signalWebReady() {
  if (!isNativeApp()) return;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const plugin = registerPlugin<{ ready(): Promise<void> }>("SplashReady");
    await plugin.ready();
  } catch {
    // Plugin not registered in this build — nothing to dismiss.
  }
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

/**
 * Prints the recipe. window.print() is a documented Web API but a bare
 * WKWebView (unlike Mobile Safari) doesn't implement it — it's a silent
 * no-op there, which is why Print did nothing inside the app. On native,
 * this calls a Capacitor plugin that hands the webview to
 * UIPrintInteractionController instead. beforeFit/afterReset let the
 * caller apply the same print-area fitting (lib/printFit.ts) that the
 * web path gets for free from the browser's beforeprint/afterprint
 * events, since triggering print this way doesn't fire those.
 */
export async function printRecipe(beforeFit: () => void, afterReset: () => void) {
  if (!isNativeApp()) {
    window.print();
    return;
  }
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const plugin = registerPlugin<{ print(): Promise<{ completed: boolean }> }>("PrintPlugin");
    beforeFit();
    try {
      await plugin.print();
    } finally {
      afterReset();
    }
  } catch {
    // Plugin not registered in this build yet — Print silently does nothing,
    // same as before, until the native file is added (docs/ios-print.md).
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
