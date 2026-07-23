"use client";

import { useEffect } from "react";
import {
  configureNativeStatusBar,
  hideNativeSplashScreen,
  isNativeApp,
  onSharedUrl,
  registerNativeShareListener,
  signalWebReady,
} from "@/lib/nativeApp";

const ONBOARDING_SIGNIN_KEY = "avocato:onboarding-signin-seen";

/** Fades out and hides the static #native-boot-splash div (see
 *  app/layout.tsx) — the boot splash lives outside React entirely so it can
 *  paint before hydration, so dismissing it is plain DOM too. */
function dismissBootSplash() {
  const el = document.getElementById("native-boot-splash");
  if (!el) return;
  el.style.transition = "opacity 300ms ease-out";
  el.style.opacity = "0";
  setTimeout(() => {
    el.style.display = "none";
  }, 300);
}

/** No-ops entirely on the regular website — only does anything inside the Capacitor iOS shell. */
export function NativeAppInit() {
  useEffect(() => {
    configureNativeStatusBar();
    registerNativeShareListener();
    signalWebReady();

    // Warm share (app already running): registerNativeShareListener fires
    // an in-page event rather than navigating, so RecipeExtractor can start
    // extraction immediately without a reload — but that only works while
    // RecipeExtractor is actually mounted, i.e. the user is already on
    // /extract. From any other tab (Home/Library/Profile) nothing would be
    // listening, and the share would silently vanish. This always-mounted
    // fallback catches that case and navigates to /extract with the link;
    // if we're already there, RecipeExtractor's own listener already
    // handled it in-page, so this is a no-op (redundant identical
    // navigation is harmless, but skip it for a snappier feel anyway).
    const unsubscribe = onSharedUrl((shared) => {
      if (window.location.pathname !== "/extract") {
        window.location.href = `/extract?url=${encodeURIComponent(shared)}`;
      }
    });

    // Hand off to the real page as soon as it's actually ready — no
    // artificial hold. The splash itself is a static image now (no bounce
    // to let play out), so the fastest handoff is also the smoothest one.
    hideNativeSplashScreen();
    dismissBootSplash();

    // Once per install: offer sign-in right after the splash, the way
    // Deglaze's onboarding does. SignInGate already listens for this event
    // and no-ops harmlessly if the user is already signed in; it's always
    // dismissible (the sheet's X / backdrop tap), so this never blocks
    // using the app without an account. Delayed slightly so the sign-in
    // sheet's own entrance animation doesn't collide with the splash's
    // fade-out.
    const timer = setTimeout(() => {
      if (isNativeApp()) {
        try {
          if (!localStorage.getItem(ONBOARDING_SIGNIN_KEY)) {
            localStorage.setItem(ONBOARDING_SIGNIN_KEY, "1");
            window.dispatchEvent(new Event("avocato:open-signin"));
          }
        } catch {
          // Storage unavailable — skip the one-time prompt rather than risk
          // showing it on every launch.
        }
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return null;
}
