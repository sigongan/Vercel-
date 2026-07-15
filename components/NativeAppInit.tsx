"use client";

import { useEffect, useState } from "react";
import {
  configureNativeStatusBar,
  hideNativeSplashScreen,
  isNativeApp,
  registerNativeShareListener,
} from "@/lib/nativeApp";
import { AvocadoMark } from "@/lib/avocadoMark";

/** No-ops entirely on the regular website — only does anything inside the Capacitor iOS shell. */
export function NativeAppInit() {
  const [showSplash, setShowSplash] = useState(isNativeApp);

  useEffect(() => {
    configureNativeStatusBar();
    registerNativeShareListener();

    // Let the spinning avocado play for a beat so the handoff from the
    // native launch image doesn't feel like an abrupt cut, then hand off
    // to the real page.
    const timer = setTimeout(() => {
      hideNativeSplashScreen();
      setShowSplash(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[999] flex items-center justify-center bg-[#fdf3ec]"
    >
      <div className="animate-avocado-spin">
        <AvocadoMark size={64} />
      </div>
    </div>
  );
}
