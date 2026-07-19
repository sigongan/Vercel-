"use client";

import { createPortal } from "react-dom";
import type { Translation } from "@/lib/i18n";
import {
  useGroceryList,
  toggleGroceryItem,
  removeGroceryItem,
  clearCheckedGroceryItems,
  groceryListAsText,
} from "@/lib/groceryList";
import { hapticTap, shareText } from "@/lib/nativeApp";

/**
 * Bottom-sheet grocery list, grouped by the recipe each item came from.
 * Portaled onto <body> for the same reason as CookMode: animated ancestors
 * leave lingering transforms that would trap position:fixed.
 */
export function GroceryListSheet({
  open,
  onClose,
  t,
}: {
  open: boolean;
  onClose: () => void;
  t: Translation;
}) {
  const items = useGroceryList();

  if (!open) return null;

  const byRecipe = new Map<string, typeof items>();
  for (const item of items) {
    const group = byRecipe.get(item.recipeTitle) ?? [];
    group.push(item);
    byRecipe.set(item.recipeTitle, group);
  }
  const hasChecked = items.some((i) => i.checked);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[85vh] flex-col rounded-t-3xl bg-[#F7F5EF] shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-base font-semibold text-[#3D5A38]">{t.groceryTitle}</h2>
          <button
            onClick={onClose}
            aria-label={t.groceryClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3EADB] text-[#5C7A4F] transition-colors hover:bg-[#E3EADB]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#7E9072]">{t.groceryEmpty}</p>
          ) : (
            [...byRecipe.entries()].map(([recipeTitle, group]) => (
              <section key={recipeTitle} className="py-3">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F7A52]">
                  {recipeTitle}
                </h3>
                <ul className="flex flex-col gap-1">
                  {group.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/60">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => {
                            hapticTap();
                            toggleGroceryItem(item.id);
                          }}
                          className="h-5 w-5 shrink-0 accent-[#5B8A52]"
                        />
                        <span
                          className={`flex-1 text-[15px] ${
                            item.checked
                              ? "text-[#8FA084] line-through"
                              : "text-[#37452F]"
                          }`}
                        >
                          {item.name}
                        </span>
                        {item.amount && (
                          <span
                            className={`shrink-0 text-sm tabular-nums ${
                              item.checked ? "text-[#C6D2BC] line-through" : "text-[#7E9072]"
                            }`}
                          >
                            {item.amount}
                          </span>
                        )}
                      </label>
                      <button
                        onClick={() => removeGroceryItem(item.id)}
                        aria-label="Remove"
                        className="shrink-0 px-1 text-sm text-[#C6D2BC] transition-colors hover:text-[#5C7A4F]"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="flex gap-2 border-t border-[#D6E2CC] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => {
                hapticTap();
                shareText(t.groceryTitle, groceryListAsText(items));
              }}
              className="flex-1 rounded-full bg-gradient-to-br from-[#9CC28C] to-[#5B8A52] py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {t.groceryShare}
            </button>
            {hasChecked && (
              <button
                onClick={() => {
                  hapticTap();
                  clearCheckedGroceryItems();
                }}
                className="flex-1 rounded-full border border-[#D6E2CC] bg-white py-2.5 text-sm font-medium text-[#5C7A4F] transition-colors hover:border-[#AECA9F]"
              >
                {t.groceryClearChecked}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
