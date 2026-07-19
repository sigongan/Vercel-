"use client";

import { useSyncExternalStore } from "react";
import type { Recipe } from "@/lib/types/recipe";

/**
 * On-device history of extracted recipes. With sign-in hidden for now,
 * a closed tab/app meant the recipe was simply gone — this keeps the last
 * fifty on the device (localStorage) so people can get back to something
 * they extracted without re-running it. Purely local: no account, no
 * server, survives app restarts, cleared only if the user clears the
 * app's/site's data.
 */
export interface RecentRecipe {
  id: string;
  savedAt: number;
  recipe: Recipe;
}

const KEY = "avocato:recent-recipes";
const MAX = 50;

const EMPTY: RecentRecipe[] = [];
const listeners = new Set<() => void>();

// Snapshot must be referentially stable between reads or
// useSyncExternalStore loops — re-parse only when the raw string changed.
let cachedRaw: string | null = null;
let cachedList: RecentRecipe[] = EMPTY;

function readSnapshot(): RecentRecipe[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cachedList = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cachedList = EMPTY;
    }
  }
  return cachedList;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function persist(list: RecentRecipe[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — history just won't persist.
  }
  listeners.forEach((l) => l());
}

/** Reactive view of the history — updates whenever an entry is added/removed. */
export function useRecentRecipes(): RecentRecipe[] {
  return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
}

export function addRecentRecipe(recipe: Recipe) {
  const entry: RecentRecipe = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    recipe,
  };
  // Re-extracting the same dish shouldn't fill the list with duplicates —
  // replace an existing entry with the same title instead.
  const rest = readSnapshot().filter((r) => r.recipe.title !== recipe.title);
  persist([entry, ...rest].slice(0, MAX));
}

export function removeRecentRecipe(id: string) {
  persist(readSnapshot().filter((r) => r.id !== id));
}
