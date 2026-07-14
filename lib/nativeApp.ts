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
    await StatusBar.setBackgroundColor({ color: "#fafaf9" });
  } catch {
    // Plugin not available — nothing to do.
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
