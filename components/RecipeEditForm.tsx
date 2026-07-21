"use client";

import { useState } from "react";
import type { Ingredient, Recipe } from "@/lib/types/recipe";
import type { Translation } from "@/lib/i18n";

const inputClass =
  "w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-900/5";

export function RecipeEditForm({
  recipe,
  t,
  onSave,
  onCancel,
}: {
  recipe: Recipe;
  t: Translation;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Recipe>(() => structuredClone(recipe));

  function updateField<K extends keyof Recipe>(key: K, value: Recipe[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updateIngredient(i: number, patch: Partial<Ingredient>) {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, idx) => (idx === i ? { ...ing, ...patch, estimated: false } : ing)),
    }));
  }
  function addIngredient() {
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, { name: "", amount: "" }] }));
  }
  function removeIngredient(i: number) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) }));
  }

  function updateStep(i: number, instruction: string) {
    setDraft((d) => ({ ...d, steps: d.steps.map((s, idx) => (idx === i ? { ...s, instruction } : s)) }));
  }
  function addStep() {
    setDraft((d) => ({ ...d, steps: [...d.steps, { order: d.steps.length + 1, instruction: "" }] }));
  }
  function removeStep(i: number) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })),
    }));
  }
  function moveStep(i: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.steps.length) return d;
      const steps = [...d.steps];
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return { ...d, steps: steps.map((s, idx) => ({ ...s, order: idx + 1 })) };
    });
  }

  function handleSave() {
    const cleaned: Recipe = {
      ...draft,
      title: draft.title.trim(),
      ingredients: draft.ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ ...i, name: i.name.trim(), amount: i.amount?.trim() || undefined })),
      steps: draft.steps
        .filter((s) => s.instruction.trim())
        .map((s, idx) => ({ order: idx + 1, instruction: s.instruction.trim() })),
    };
    onSave(cleaned);
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 sm:p-8 flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.editTitleLabel}</span>
        <input className={inputClass} value={draft.title} onChange={(e) => updateField("title", e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          {t.editDescriptionLabel}
        </span>
        <textarea
          className={`${inputClass} resize-y`}
          rows={4}
          value={draft.description ?? ""}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.serves}</span>
          <input
            className={inputClass}
            value={draft.servings ?? ""}
            onChange={(e) => updateField("servings", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.prep}</span>
          <input
            className={inputClass}
            value={draft.prepTime ?? ""}
            onChange={(e) => updateField("prepTime", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.cook}</span>
          <input
            className={inputClass}
            value={draft.cookTime ?? ""}
            onChange={(e) => updateField("cookTime", e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.ingredients}</span>
        {draft.ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputClass}
              placeholder={t.editIngredientNamePlaceholder}
              value={ing.name}
              onChange={(e) => updateIngredient(i, { name: e.target.value })}
            />
            <input
              className={`${inputClass} w-32`}
              placeholder={t.editIngredientAmountPlaceholder}
              value={ing.amount ?? ""}
              onChange={(e) => updateIngredient(i, { amount: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeIngredient(i)}
              aria-label={t.editRemove}
              className="shrink-0 text-stone-400 hover:text-red-500 px-2"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addIngredient}
          className="self-start text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline underline-offset-2"
        >
          + {t.editAddIngredient}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.steps}</span>
        {draft.steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-[11px] font-semibold text-stone-50 dark:text-stone-900">
              {i + 1}
            </span>
            <textarea
              className={inputClass}
              rows={2}
              value={step.instruction}
              onChange={(e) => updateStep(i, e.target.value)}
            />
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => moveStep(i, -1)}
                disabled={i === 0}
                aria-label={t.editMoveUp}
                className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 px-1"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveStep(i, 1)}
                disabled={i === draft.steps.length - 1}
                aria-label={t.editMoveDown}
                className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 px-1"
              >
                ↓
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeStep(i)}
              aria-label={t.editRemove}
              className="shrink-0 text-stone-400 hover:text-red-500 px-2"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="self-start text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline underline-offset-2"
        >
          + {t.editAddStep}
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.editTagsLabel}</span>
        <input
          className={inputClass}
          value={draft.tags.join(", ")}
          onChange={(e) =>
            updateField(
              "tags",
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
            )
          }
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t.notes}</span>
        <textarea
          className={inputClass}
          rows={2}
          value={draft.notes ?? ""}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </label>

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-700">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:border-stone-400"
        >
          {t.editCancel}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!draft.title.trim()}
          className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-sm font-medium hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-40"
        >
          {t.editSave}
        </button>
      </div>
    </div>
  );
}
