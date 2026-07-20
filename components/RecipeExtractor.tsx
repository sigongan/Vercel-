"use client";

import { useEffect, useState } from "react";
import type { ExtractRecipeResult, Recipe } from "@/lib/types/recipe";
import { RecipeCard } from "./RecipeCard";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { compressImageFile } from "@/lib/compressImage";
import { AvocadoMark } from "@/lib/avocadoMark";
import { SOURCE_ICONS } from "@/components/SourceIcons";
import {
  onSharedUrl,
  hapticTap,
  hapticSuccess,
  hapticError,
} from "@/lib/nativeApp";
import {
  useRecentRecipes,
  addRecentRecipe,
  removeRecentRecipe,
} from "@/lib/recentRecipes";
import { useGroceryList } from "@/lib/groceryList";
import { GroceryListSheet } from "./GroceryList";
import { UploadSourceSheet } from "./UploadSourceSheet";

type Tab = "file" | "url" | "text" | "fridge";

interface SubmitError {
  message: string;
  code?: string;
}

// A plain <input accept> spanning image+video+pdf is what makes iOS show its
// 3-way "Photo Library / Take Photo / Choose File" chooser — UploadSourceSheet
// gives each of its own buttons one of these narrower lists instead, so
// tapping one goes straight to a single native picker.
const PHOTO_ACCEPT_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const DOCUMENT_ACCEPT_TYPES = "application/pdf";

export function RecipeExtractor() {
  const { language } = useLanguage();
  const t = translations[language];

  const [tab, setTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fridgeText, setFridgeText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<SubmitError | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const recent = useRecentRecipes();
  const groceryItems = useGroceryList();
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [recentQuery, setRecentQuery] = useState("");
  const filteredRecent = recentQuery.trim()
    ? recent.filter((item) =>
        item.recipe.title.toLowerCase().includes(recentQuery.trim().toLowerCase()),
      )
    : recent;

  useEffect(() => {
    if (recipe) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [recipe]);

  function backToStart() {
    setRecipe(null);
    setError(null);
    setStatus("idle");
  }

  async function handleFileSelected(selected: File | null) {
    if (!selected) {
      setFile(null);
      return;
    }
    setPreparingFile(true);
    try {
      const prepared = selected.type.startsWith("image/")
        ? await compressImageFile(selected)
        : selected;
      setFile(prepared);
    } finally {
      setPreparingFile(false);
    }
  }

  const canSubmit =
    tab === "file"
      ? Boolean(file) && !preparingFile
      : tab === "url"
        ? url.trim().length > 0
        : tab === "fridge"
          ? fridgeText.trim().length > 0
          : text.trim().length > 0;

  const errorMessage = error
    ? error.code && error.code in t.errors
      ? t.errors[error.code as keyof typeof t.errors]
      : error.message
    : null;

  async function startExtraction(
    input:
      | { kind: "file"; file: File }
      | { kind: "url"; url: string }
      | { kind: "text"; text: string }
      | { kind: "pantry"; text: string },
  ) {
    setStatus("loading");
    setError(null);
    setRecipe(null);
    hapticTap();

    try {
      const response = await (input.kind === "file"
        ? submitFile(input.file, language)
        : input.kind === "url"
          ? submitJson({ url: input.url, lang: language })
          : input.kind === "pantry"
            ? submitJson({ text: input.text, pantry: true, lang: language })
            : submitJson({ text: input.text, lang: language }));

      const rawBody = await response.text();
      let data: ExtractRecipeResult;
      try {
        data = JSON.parse(rawBody);
      } catch {
        console.error(
          "extract-recipe: non-JSON response",
          response.status,
          rawBody.slice(0, 500),
        );
        throw new Error(
          response.status === 504 || response.status === 408
            ? "TIMEOUT"
            : `HTTP_${response.status}`,
        );
      }

      if (data.ok) {
        setRecipe(data.recipe);
        setStatus("idle");
        hapticSuccess();
        addRecentRecipe(data.recipe);
      } else {
        setError({ message: data.error.error, code: data.error.code });
        setStatus("error");
        hapticError();
      }
    } catch (err) {
      console.error("extract-recipe: request failed", err);
      const reason = err instanceof Error ? err.message : undefined;
      setError({
        message: reason === "TIMEOUT" ? t.errors.TIMEOUT : t.errors.NETWORK,
        code: reason === "TIMEOUT" ? "TIMEOUT" : "NETWORK",
      });
      setStatus("error");
      hapticError();
    }
  }

  // Deep-link entry: /?url=<shared link> switches to the Link tab, fills it
  // in, and starts extraction immediately. This is what the iOS share sheet
  // ("Share → Avocato" from TikTok/YouTube) lands on, and it also makes
  // shareable marketing links that demo the product in one tap.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search)
      .get("url")
      ?.trim();
    if (!shared) return;
    // Clear the query so a reload doesn't re-consume quota.
    window.history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => {
      setTab("url");
      setUrl(shared);
      startExtraction({ kind: "url", url: shared });
    });
    // Run once on mount only — startExtraction is stable in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same deep-link entry, but for shares that arrive while the app is
  // already running (no page reload — see onSharedUrl in lib/nativeApp.ts
  // for why the reload was making warm shares feel slow/choppy).
  useEffect(() => {
    return onSharedUrl((shared) => {
      setTab("url");
      setUrl(shared);
      startExtraction({ kind: "url", url: shared });
    });
    // Subscribe once — startExtraction is stable in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "loading") return;
    if (tab === "file")
      return startExtraction({ kind: "file", file: file as File });
    if (tab === "url") return startExtraction({ kind: "url", url: url.trim() });
    if (tab === "fridge")
      return startExtraction({ kind: "pantry", text: fridgeText.trim() });
    return startExtraction({ kind: "text", text: text.trim() });
  }

  if (recipe) {
    return (
      <div className="relative z-[1] w-full max-w-3xl flex flex-col gap-4 animate-fade-in-up">
        <button
          type="button"
          onClick={backToStart}
          className="self-start flex items-center gap-1.5 text-sm font-medium text-[#4D7C0F] hover:text-[#232920] dark:hover:text-stone-200 transition-colors"
        >
          <BackIcon />
          {t.backToStart}
        </button>
        <RecipeCard recipe={recipe} onRecipeChange={setRecipe} />
      </div>
    );
  }

  return (
    <div className="relative z-[1] w-full flex flex-col items-center gap-10">
      <header className="flex flex-col items-center gap-3 text-center max-w-2xl">
        <p className="text-base sm:text-lg text-[#5D6551] dark:text-stone-400 leading-relaxed max-w-xl">
          {t.tagline}
        </p>
        <ul className="flex flex-wrap justify-center gap-2 mt-1">
          {t.sources.map((source) => (
            <li
              key={source}
              className="flex items-center gap-1.5 text-xs font-medium text-[#5D6551] dark:text-stone-400 bg-white dark:bg-stone-900/70 shadow-[0_2px_8px_rgba(110,150,60,0.10)] dark:shadow-none border border-transparent dark:border-stone-800 rounded-full pl-2.5 pr-3 py-1"
            >
              {SOURCE_ICONS[source]}
              {source}
            </li>
          ))}
        </ul>
      </header>

      <div className="w-full max-w-2xl rounded-[32px] border border-transparent dark:border-stone-800 bg-white dark:bg-stone-900 shadow-[0_10px_34px_rgba(105,150,55,0.14)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-5 sm:p-7 flex flex-col gap-5">
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-4 py-14 animate-fade-in-up">
            <div className="animate-avocado-spin">
              <AvocadoMark size={56} />
            </div>
            <LoadingMessages messages={t.extractingSteps} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1 rounded-full bg-[#F1F4EA] dark:bg-stone-800 p-1">
              <TabButton
                active={tab === "file"}
                onClick={() => setTab("file")}
                icon={<UploadIcon />}
              >
                {t.tabFile}
              </TabButton>
              <TabButton
                active={tab === "url"}
                onClick={() => setTab("url")}
                icon={<LinkIcon />}
              >
                {t.tabUrl}
              </TabButton>
              <TabButton
                active={tab === "text"}
                onClick={() => setTab("text")}
                icon={<TextIcon />}
              >
                {t.tabText}
              </TabButton>
              <TabButton
                active={tab === "fridge"}
                onClick={() => setTab("fridge")}
                icon={<FridgeIcon />}
              >
                {t.tabFridge}
              </TabButton>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {tab === "file" && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setUploadSheetOpen(true)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setUploadSheetOpen(true)
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) handleFileSelected(dropped);
                  }}
                  className="rounded-[24px] border-2 border-dashed border-[#E2E6D9] dark:border-stone-700 bg-[#FCFCF9] dark:bg-stone-950/40 py-12 px-6 flex flex-col items-center gap-3 text-center cursor-pointer transition-colors hover:border-[#61A00E80] hover:bg-[#F1F4EA] dark:hover:bg-stone-800/50"
                >
                  <span className="flex items-center justify-center w-13 h-13 rounded-full bg-[#F2F7E8] dark:bg-stone-800 text-[#4D7C0F] dark:text-stone-400">
                    <UploadIcon size={22} />
                  </span>
                  {preparingFile ? (
                    <span className="text-sm text-[#5D6551] dark:text-stone-400">
                      {t.preparingFile}
                    </span>
                  ) : file ? (
                    <span className="flex items-center gap-2 text-sm font-medium text-[#232920] dark:text-stone-200">
                      {file.name}
                      <span className="text-[#9AA093] font-normal">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        aria-label={t.clearFile}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-[#9AA093] hover:text-[#232920] dark:hover:text-stone-200 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <>
                      <span className="text-[15px] font-medium text-[#232920] dark:text-stone-200">
                        {t.uploadTitle}
                      </span>
                      <span className="text-xs text-[#9AA093]">
                        {t.uploadHint}
                      </span>
                    </>
                  )}
                </div>
              )}

              {tab === "url" && (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[#232920] dark:text-stone-300">
                    {t.urlLabel}
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t.urlPlaceholder}
                    className="w-full rounded-xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] dark:placeholder-stone-600 outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10 dark:focus:ring-stone-100/5"
                  />
                </label>
              )}

              {tab === "text" && (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[#232920] dark:text-stone-300">
                    {t.textLabel}
                  </span>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t.textPlaceholder}
                    rows={8}
                    className="w-full resize-y rounded-xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm leading-relaxed text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] dark:placeholder-stone-600 outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10 dark:focus:ring-stone-100/5"
                  />
                </label>
              )}

              {tab === "fridge" && (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[#232920] dark:text-stone-300">
                    {t.fridgeLabel}
                  </span>
                  <textarea
                    value={fridgeText}
                    onChange={(e) => setFridgeText(e.target.value)}
                    placeholder={t.fridgePlaceholder}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-[#E2E6D9] dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm leading-relaxed text-[#30362B] dark:text-stone-100 placeholder-[#9AA093] dark:placeholder-stone-600 outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10 dark:focus:ring-stone-100/5"
                  />
                  <span className="text-xs text-[#9AA093]">{t.fridgeHint}</span>
                </label>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-full bg-gradient-to-br from-[#8BC926] to-[#61A00E] text-white dark:bg-stone-100 dark:text-stone-900 py-3.5 text-[15px] font-semibold shadow-[0_8px_20px_rgba(97,160,14,0.35)] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {t.extract}
              </button>
            </form>
          </>
        )}
      </div>

      {status === "error" && errorMessage && (
        <div className="w-full max-w-2xl rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-5 py-4">
          <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
            {errorMessage}
          </p>
        </div>
      )}

      {status !== "loading" && groceryItems.length > 0 && (
        <button
          type="button"
          onClick={() => {
            hapticTap();
            setGroceryOpen(true);
          }}
          className="flex items-center gap-2 rounded-full border border-[#E2E6D9] bg-white px-4 py-2 text-sm font-medium text-[#5E7A33] shadow-[0_4px_14px_rgba(105,150,55,0.08)] transition-colors hover:border-[#C0DC8C]"
        >
          🛒 {t.groceryTitle}
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#61A00E] px-1.5 text-[11px] font-semibold text-white">
            {groceryItems.filter((i) => !i.checked).length}
          </span>
        </button>
      )}
      {groceryOpen && (
        <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} t={t} />
      )}

      <UploadSourceSheet
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onFile={handleFileSelected}
        photoAccept={PHOTO_ACCEPT_TYPES}
        fileAccept={DOCUMENT_ACCEPT_TYPES}
        t={t}
      />

      {status !== "loading" && recent.length > 0 && (
        <section className="w-full max-w-2xl flex flex-col gap-3">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9AA093]">
            {t.recentTitle}
          </h2>
          {recent.length > 5 && (
            <input
              type="search"
              value={recentQuery}
              onChange={(e) => setRecentQuery(e.target.value)}
              placeholder={t.recentSearch}
              className="w-full rounded-xl border border-[#E2E6D9] bg-white px-4 py-2.5 text-sm text-[#30362B] placeholder-[#9AA093] outline-none transition-shadow focus:border-[#61A00E] focus:ring-4 focus:ring-[#61A00E]/10"
            />
          )}
          <ul className="flex flex-col gap-2">
            {filteredRecent.map((item) => (
              <li key={item.id}>
                <div className="flex items-center gap-3 rounded-2xl border border-transparent bg-white px-4 py-3 shadow-[0_4px_14px_rgba(105,150,55,0.08)] transition-shadow hover:shadow-[0_6px_20px_rgba(105,150,55,0.16)]">
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setError(null);
                      setStatus("idle");
                      setRecipe(item.recipe);
                    }}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                  >
                    <span className="w-full truncate text-sm font-medium text-[#30362B]">
                      {item.recipe.title}
                    </span>
                    <span className="text-xs text-[#9AA093]">
                      {timeAgo(item.savedAt, language)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t.recentRemove}
                    onClick={() => removeRecentRecipe(item.id)}
                    className="shrink-0 text-[#9AA093] transition-colors hover:text-[#232920]"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Cycles through the playful extraction-progress lines while loading. */
function LoadingMessages({ messages }: { messages: readonly string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      2200,
    );
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <p
      key={index}
      className="animate-fade-in-up text-sm font-medium text-[#5D6551] dark:text-stone-400"
    >
      {messages[index]}
    </p>
  );
}

function timeAgo(timestamp: number, language: string): string {
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const minutes = Math.round((timestamp - Date.now()) / 60_000);
  if (minutes > -60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-white dark:bg-stone-900 text-[#4D7C0F] dark:text-stone-100 shadow-[0_2px_8px_rgba(110,150,60,0.15)]"
          : "text-[#6B7261] hover:text-[#232920] dark:hover:text-stone-300"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function FridgeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <line x1="6" y1="10" x2="18" y2="10" />
      <line x1="9" y1="5" x2="9" y2="7" />
      <line x1="9" y1="13" x2="9" y2="16" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function submitFile(file: File, lang: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lang", lang);
  return fetch("/api/extract-recipe", { method: "POST", body: formData });
}

function submitJson(body: Record<string, string | boolean>) {
  return fetch("/api/extract-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
