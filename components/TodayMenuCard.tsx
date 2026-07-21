"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { AvocadoMark } from "@/lib/avocadoMark";
import { RecipeCard } from "./RecipeCard";
import { UploadSourceSheet } from "./UploadSourceSheet";
import { compressImageFile } from "@/lib/compressImage";
import { addRecentRecipe } from "@/lib/recentRecipes";
import { hapticTap, hapticSuccess, hapticError } from "@/lib/nativeApp";
import type { Recipe } from "@/lib/types/recipe";
import type { PantrySuggestionsResult } from "@/app/api/pantry-suggestions/route";

const PHOTO_ACCEPT_TYPES = "image/jpeg,image/png,image/webp,image/gif";

type Mode = "idle" | "loading" | "results" | "recipe" | "error";

/** Home's "what should I eat today?" card: a fridge photo or a quick
 *  ingredient list in, three distinct dish ideas out. Picking one shows the
 *  full recipe right here and saves it to Recent, same as a real extraction. */
export function TodayMenuCard() {
  const { language } = useLanguage();
  const t = translations[language];

  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(photo) || text.trim().length > 0;

  async function handlePhoto(file: File | null) {
    if (!file) return;
    hapticTap();
    setPhoto(file.type.startsWith("image/") ? await compressImageFile(file) : file);
  }

  async function handleSubmit() {
    if (!canSubmit || mode === "loading") return;
    hapticTap();
    setMode("loading");
    setError(null);
    try {
      let res: Response;
      if (photo) {
        const formData = new FormData();
        formData.append("image", photo);
        formData.append("lang", language);
        res = await fetch("/api/pantry-suggestions", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/pantry-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim(), lang: language }),
        });
      }
      const data: PantrySuggestionsResult = await res.json();
      if (!data.ok) {
        setError(data.error.error);
        setMode("error");
        hapticError();
        return;
      }
      setSuggestions(data.recipes);
      setMode("results");
      hapticSuccess();
    } catch {
      setError(t.errors.NETWORK);
      setMode("error");
      hapticError();
    }
  }

  function pickSuggestion(recipe: Recipe) {
    hapticTap();
    addRecentRecipe(recipe);
    setSelected(recipe);
    setMode("recipe");
  }

  function reset() {
    hapticTap();
    setMode("idle");
    setText("");
    setPhoto(null);
    setSuggestions([]);
    setSelected(null);
    setError(null);
  }

  return (
    <section className="relative z-10 flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-800 p-5">
      {mode !== "recipe" && (
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold text-[#232920] dark:text-stone-50">{t.todayMenuTitle}</h2>
          <p className="text-[13px] text-[#9AA093]">{t.todayMenuSub}</p>
        </div>
      )}

      {mode === "idle" && (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.todayMenuPlaceholder}
            rows={2}
            className="w-full resize-none rounded-xl border-none bg-[#F1F4EA] dark:bg-stone-700 px-4 py-3 text-[15px] text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] outline-none transition-shadow focus:ring-2 focus:ring-[#61A00E]/30"
          />
          {photo && (
            <div className="flex items-center gap-2 rounded-xl bg-[#F2F7E8] dark:bg-stone-700 px-3 py-2 text-xs font-medium text-[#4D7C0F] dark:text-stone-300">
              <CameraIcon />
              <span className="flex-1 truncate">{photo.name}</span>
              <button type="button" onClick={() => setPhoto(null)} className="text-[#9AA093] hover:text-[#232920] dark:hover:text-stone-200">
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                hapticTap();
                setUploadSheetOpen(true);
              }}
              aria-label={t.todayMenuPhoto}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E2E6D9] dark:border-stone-600 text-[#5E7A33] dark:text-stone-300 transition-colors hover:bg-[#F1F4EA] dark:hover:bg-stone-700"
            >
              <CameraIcon />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-11 flex-1 rounded-full bg-[#61A00E] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:bg-[#F1F4EA] disabled:text-[#9AA093] dark:disabled:bg-stone-700 dark:disabled:text-stone-500"
            >
              {t.todayMenuSubmit}
            </button>
          </div>
        </div>
      )}

      {mode === "loading" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="animate-avocado-spin">
            <AvocadoMark size={40} />
          </div>
          <p className="text-sm font-medium text-[#5D6551] dark:text-stone-400">{t.todayMenuLoading}</p>
        </div>
      )}

      {mode === "error" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-6 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-white dark:bg-stone-800 border border-red-200 dark:border-red-900 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300"
          >
            {t.todayMenuTryAgain}
          </button>
        </div>
      )}

      {mode === "results" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[#9AA093]">{t.todayMenuPickOne}</p>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="flex w-full flex-col items-start gap-1 rounded-2xl border border-[#E2E6D9] dark:border-stone-700 bg-[#FCFCF9] dark:bg-stone-900 px-4 py-3 text-left transition-colors hover:border-[#C0DC8C]"
                >
                  <span className="text-sm font-semibold text-[#232920] dark:text-stone-100">{s.title}</span>
                  {s.description && (
                    <span className="text-xs text-[#6B7261] dark:text-stone-400 line-clamp-2">{s.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={reset}
            className="self-center text-xs font-medium text-[#4D7C0F] dark:text-lime-500 hover:text-[#232920] dark:hover:text-stone-100"
          >
            {t.todayMenuTryAgain}
          </button>
        </div>
      )}

      {mode === "recipe" && selected && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              hapticTap();
              setMode("results");
            }}
            className="self-start text-xs font-medium text-[#4D7C0F] dark:text-lime-500 hover:text-[#232920] dark:hover:text-stone-100"
          >
            {t.todayMenuBackToIdeas}
          </button>
          <RecipeCard recipe={selected} onRecipeChange={setSelected} />
        </div>
      )}

      <UploadSourceSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onFile={handlePhoto}
        photoAccept={PHOTO_ACCEPT_TYPES}
        fileAccept={PHOTO_ACCEPT_TYPES}
        t={t}
      />
    </section>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
