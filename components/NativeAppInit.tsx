"use client";

import { useEffect } from "react";
import {
  configureNativeStatusBar,
  hideNativeSplashScreen,
  registerNativeShareListener,
} from "@/lib/nativeApp";

/** No-ops entirely on the regular website — only does anything inside the Capacitor iOS shell. */
export function NativeAppInit() {
  useEffect(() => {
    configureNativeStatusBar();
    hideNativeSplashScreen();
    registerNativeShareListener();
  }, []);

  return null;
}
