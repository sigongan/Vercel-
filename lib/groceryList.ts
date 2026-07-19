"use client";

import { useSyncExternalStore } from "react";
import type { Recipe } from "@/lib/types/recipe";

/**
 * On-device grocery list. One tap on a recipe adds its ingredients (with
 * the amounts as currently displayed — scaled/converted included); at the
 * store you check items off. Purely local, same localStorage +
 * useSyncExternalStore pattern as lib/recentRecipes.ts.
 */
export interface GroceryItem {
  id: string;
  name: string;
  amount?: string;
  recipeTitle: string;
  checked: boolean;
}

const KEY = "avocato:grocery-list";

const EMPTY: GroceryItem[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedList: GroceryItem[] = EMPTY;

function readSnapshot(): GroceryItem[] {
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

function persist(list: GroceryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — list just won't persist.
  }
  listeners.forEach((l) => l());
}

export function useGroceryList(): GroceryItem[] {
  return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
}

/**
 * Adds a recipe's ingredients. Re-adding the same recipe replaces its
 * previous items instead of duplicating them (amounts may have been
 * rescaled in between).
 */
export function addRecipeToGroceryList(recipe: Recipe) {
  const rest = readSnapshot().filter((item) => item.recipeTitle !== recipe.title);
  const added: GroceryItem[] = recipe.ingredients.map((ing, i) => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    name: ing.name,
    amount: ing.amount,
    recipeTitle: recipe.title,
    checked: false,
  }));
  persist([...rest, ...added]);
}

export function toggleGroceryItem(id: string) {
  persist(readSnapshot().map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
}

export function removeGroceryItem(id: string) {
  persist(readSnapshot().filter((item) => item.id !== id));
}

export function clearCheckedGroceryItems() {
  persist(readSnapshot().filter((item) => !item.checked));
}

/** Plain-text version for sharing/copying ("- 250g spaghetti"). */
export function groceryListAsText(items: GroceryItem[]): string {
  const open = items.filter((i) => !i.checked);
  return open.map((i) => `- ${i.amount ? `${i.amount} ` : ""}${i.name}`).join("\n");
}
