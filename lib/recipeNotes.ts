"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Personal notes per recipe — tweaks, substitutions, "came out great with
 * half the sugar". Keyed by recipe title, stored only on the device, same
 * localStorage + useSyncExternalStore pattern as lib/recentRecipes.ts.
 */
const KEY = "avocato:recipe-notes";

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedMap: Record<string, string> = {};

function readMap(): Record<string, string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cachedMap;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      cachedMap = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      cachedMap = {};
    }
  }
  return cachedMap;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Reactive note for one recipe + a setter that persists as you type. */
export function useRecipeNote(title: string): [string, (note: string) => void] {
  const note = useSyncExternalStore(
    subscribe,
    () => readMap()[title] ?? "",
    () => "",
  );

  const setNote = useCallback(
    (value: string) => {
      const map = { ...readMap() };
      if (value.trim()) {
        map[title] = value;
      } else {
        delete map[title];
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(map));
      } catch {
        // Storage full or unavailable — the note just won't persist.
      }
      listeners.forEach((l) => l());
    },
    [title],
  );

  return [note, setNote];
}
