"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "default" | "pink" | "dark";

const STORAGE_KEY = "avocato:theme";
const CHANGE_EVENT = "app:theme-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readStored(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "pink" || raw === "dark") return raw;
    return "default";
  } catch {
    return "default";
  }
}

function getServerSnapshot(): Theme {
  return "default";
}

/** Mirrors the blocking script in app/layout.tsx (which sets this before
 *  first paint to avoid a flash of the wrong theme) — kept here too so
 *  React's state agrees with the DOM from the first render. */
function applyToDocument(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  if (theme === "pink") root.setAttribute("data-theme", "pink");
  else root.removeAttribute("data-theme");
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  useEffect(() => {
    applyToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private browsing etc.) — theme just won't persist
    }
    applyToDocument(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { theme, setTheme };
}
