"use client";

import { useEffect, useState } from "react";
import {
  configureNativeStatusBar,
  hideNativeSplashScreen,
  isNativeApp,
  registerNativeShareListener,
} from "@/lib/nativeApp";
import { AvocadoMark } from "@/lib/avocadoMark";
import { translations } from "@/lib/i18n";

const t = translations.en;

/** True only for the page load a shared link (avocato://share?url=...) landed on. */
function hasSharedLink(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("url");
}

/** No-ops entirely on the regular website — only does anything inside the Capacitor iOS shell. */
export function NativeAppInit() {
  const [showSplash, setShowSplash] = useState(isNativeApp);
  const [sharedLinkLaunch] = useState(hasSharedLink);

  useEffect(() => {
    configureNativeStatusBar();
    registerNativeShareListener();

    function dismiss() {
      hideNativeSplashScreen();
      setShowSplash(false);
    }

    if (sharedLinkLaunch) {
      // Hand off the instant real extraction work begins instead of a fixed
      // delay, so there's no flash of the plain input screen in between —
      // but still bail out on a fallback timer if extraction never starts
      // for some reason, so the splash can't get stuck forever.
      window.addEventListener("avocato:extraction-started", dismiss, { once: true });
      const fallback = setTimeout(dismiss, 4000);
      return () => {
        window.removeEventListener("avocato:extraction-started", dismiss);
        clearTimeout(fallback);
      };
    }

    // Plain app open: let the bouncing avocado play a couple hops so the
    // handoff from the native launch image doesn't feel like an abrupt cut.
    const timer = setTimeout(dismiss, 1000);
    return () => clearTimeout(timer);
  }, [sharedLinkLaunch]);

  if (!showSplash) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-[#fdf3ec]"
    >
      <div className="animate-avocado-bounce">
        <AvocadoMark size={64} />
      </div>
      <div className="h-2.5 w-11 rounded-full bg-[#b5573b] animate-avocado-bounce-shadow" />
      {sharedLinkLaunch && (
        <p className="text-sm font-medium text-[#a97e6b]">{t.sharedLinkPreparing}</p>
      )}
    </div>
  );
}
