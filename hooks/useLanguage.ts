"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Language } from "@/lib/i18n";

const STORAGE_KEY = "language";
const CHANGE_EVENT = "app:language-change";
const VALID_LANGUAGES: readonly Language[] = ["en", "de", "it", "es", "fr", "pt"];

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_LANGUAGES.includes(stored as Language) ? (stored as Language) : "en";
  } catch {
    return "en";
  }
}

function getServerSnapshot(): Language {
  return "en";
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLanguage = useCallback((lang: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable (private browsing etc.) — language just won't persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { language, setLanguage };
}
