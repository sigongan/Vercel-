"use client";

import { useEffect, useState } from "react";
import {
  configureNativeStatusBar,
  hideNativeSplashScreen,
  isNativeApp,
  registerNativeShareListener,
  signalWebReady,
} from "@/lib/nativeApp";
import { AvocadoMark } from "@/lib/avocadoMark";

const ONBOARDING_SIGNIN_KEY = "avocato:onboarding-signin-seen";

/** No-ops entirely on the regular website — only does anything inside the Capacitor iOS shell. */
export function NativeAppInit() {
  const [showSplash, setShowSplash] = useState(isNativeApp);

  useEffect(() => {
    configureNativeStatusBar();
    registerNativeShareListener();
    signalWebReady();

    // Let the bouncing avocado play a few hops so the handoff from the
    // native launch image doesn't feel like an abrupt cut, then hand off
    // to the real page. Kept in sync with the native minimum in
    // AvocatoViewController.swift's webReady().
    const timer = setTimeout(() => {
      hideNativeSplashScreen();
      setShowSplash(false);

      // Once per install: offer sign-in right after the splash, the way
      // Deglaze's onboarding does. AuthPanel already listens for this
      // event and no-ops harmlessly if the user is already signed in;
      // it's always dismissible (the sheet's X / backdrop tap), so this
      // never blocks using the app without an account.
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
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-[#FAFAF7]"
    >
      <div className="animate-avocado-bounce">
        <AvocadoMark size={64} />
      </div>
      <div className="h-2.5 w-11 rounded-full bg-[#4D7C0F] animate-avocado-bounce-shadow" />
      <p className="mt-2 text-[15px] font-medium text-[#5D6551] animate-pulse">
        Warming up the kitchen…
      </p>
    </div>
  );
}
