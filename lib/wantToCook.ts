"use client";

import { useSyncExternalStore } from "react";
import type { Recipe } from "@/lib/types/recipe";

/**
 * On-device "want to cook" list — a lightweight wishlist separate from
 * Recent (everything ever extracted) and Saved (Pro-only, synced). Anyone
 * can flag a recipe here with one tap, no account needed, same local-first
 * pattern as recentRecipes.ts.
 */
export interface WantToCookItem {
  id: string;
  addedAt: number;
  recipe: Recipe;
}

const KEY = "avocato:want-to-cook";
const MAX = 200;

const EMPTY: WantToCookItem[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedList: WantToCookItem[] = EMPTY;

function readSnapshot(): WantToCookItem[] {
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

function persist(list: WantToCookItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — list just won't persist.
  }
  listeners.forEach((l) => l());
}

/** Reactive view of the list — updates whenever an entry is added/removed. */
export function useWantToCook(): WantToCookItem[] {
  return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
}

/** Reactive "is this recipe already on the list" flag, keyed by title like
 *  recentRecipes' own dedup — recipes don't have a stable id of their own. */
export function useIsWantToCook(title: string): boolean {
  const list = useWantToCook();
  return list.some((item) => item.recipe.title === title);
}

export function addWantToCook(recipe: Recipe) {
  const rest = readSnapshot().filter((r) => r.recipe.title !== recipe.title);
  const entry: WantToCookItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    recipe,
  };
  persist([entry, ...rest].slice(0, MAX));
}

export function removeWantToCookByTitle(title: string) {
  persist(readSnapshot().filter((r) => r.recipe.title !== title));
}

export function removeWantToCook(id: string) {
  persist(readSnapshot().filter((r) => r.id !== id));
}

export function toggleWantToCook(recipe: Recipe) {
  const exists = readSnapshot().some((r) => r.recipe.title === recipe.title);
  if (exists) removeWantToCookByTitle(recipe.title);
  else addWantToCook(recipe);
}
