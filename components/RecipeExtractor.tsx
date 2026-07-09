"use client";

import { useRef, useState } from "react";
import type { ExtractRecipeResult, Recipe } from "@/lib/types/recipe";
import { RecipeCard } from "./RecipeCard";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { compressImageFile } from "@/lib/compressImage";

type Tab = "file" | "url" | "text";

interface SubmitError {
  message: string;
  code?: string;
}

const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm";

export function RecipeExtractor() {
  const { language } = useLanguage();
  const t = translations[language];

  const [tab, setTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<SubmitError | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        : text.trim().length > 0;

  const errorMessage = error
    ? language === "en" && error.code && error.code in t.errors
      ? t.errors[error.code as keyof typeof t.errors]
      : error.message
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "loading") return;

    setStatus("loading");
    setError(null);
    setRecipe(null);

    try {
      const response = await (tab === "file"
        ? submitFile(file as File, language)
        : tab === "url"
          ? submitJson({ url: url.trim(), lang: language })
          : submitJson({ text: text.trim(), lang: language }));

      const rawBody = await response.text();
      let data: ExtractRecipeResult;
      try {
        data = JSON.parse(rawBody);
      } catch {
        console.error("extract-recipe: non-JSON response", response.status, rawBody.slice(0, 500));
        throw new Error(
          response.status === 504 || response.status === 408
            ? "TIMEOUT"
            : `HTTP_${response.status}`
        );
      }

      if (data.ok) {
        setRecipe(data.recipe);
        setStatus("idle");
      } else {
        setError({ message: data.error.error, code: data.error.code });
        setStatus("error");
      }
    } catch (err) {
      console.error("extract-recipe: request failed", err);
      const reason = err instanceof Error ? err.message : undefined;
      setError({
        message: reason === "TIMEOUT" ? t.errors.TIMEOUT : t.errors.NETWORK,
        code: reason === "TIMEOUT" ? "TIMEOUT" : "NETWORK",
      });
      setStatus("error");
    }
  }

  return (
    <div className="relative z-[1] w-full flex flex-col items-center gap-10">
      <div className="w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-5 sm:p-7 flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
          <TabButton active={tab === "file"} onClick={() => setTab("file")} icon={<UploadIcon />}>
            {t.tabFile}
          </TabButton>
          <TabButton active={tab === "url"} onClick={() => setTab("url")} icon={<LinkIcon />}>
            {t.tabUrl}
          </TabButton>
          <TabButton active={tab === "text"} onClick={() => setTab("text")} icon={<TextIcon />}>
            {t.tabText}
          </TabButton>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {tab === "file" && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleFileSelected(dropped);
              }}
              className="rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950/40 py-12 px-6 flex flex-col items-center gap-3 text-center cursor-pointer transition-colors hover:border-orange-600/50 hover:bg-orange-50/40 dark:hover:bg-stone-800/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              />
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                <UploadIcon size={22} />
              </span>
              {preparingFile ? (
                <span className="text-sm text-stone-500 dark:text-stone-400">{t.preparingFile}</span>
              ) : file ? (
                <span className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200">
                  {file.name}
                  <span className="text-stone-400 font-normal">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    aria-label={t.clearFile}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <>
                  <span className="text-[15px] font-medium text-stone-800 dark:text-stone-200">
                    {t.uploadTitle}
                  </span>
                  <span className="text-xs text-stone-400">{t.uploadHint}</span>
                </>
              )}
            </div>
          )}

          {tab === "url" && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{t.urlLabel}</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.urlPlaceholder}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none transition-shadow focus:border-stone-500 focus:ring-4 focus:ring-stone-900/5 dark:focus:ring-stone-100/5"
              />
            </label>
          )}

          {tab === "text" && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{t.textLabel}</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.textPlaceholder}
                rows={8}
                className="w-full resize-y rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm leading-relaxed text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none transition-shadow focus:border-stone-500 focus:ring-4 focus:ring-stone-900/5 dark:focus:ring-stone-100/5"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={!canSubmit || status === "loading"}
            className="w-full rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 py-3.5 text-[15px] font-medium transition-colors hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            {status === "loading" && (
              <span className="inline-block animate-spin text-lg leading-none" aria-hidden>
                🥑
              </span>
            )}
            {status === "loading" ? t.extracting : t.extract}
          </button>
        </form>
      </div>

      {status === "error" && errorMessage && (
        <div className="w-full max-w-2xl rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-5 py-4">
          <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {recipe && (
        <div className="w-full max-w-3xl">
          <RecipeCard recipe={recipe} />
        </div>
      )}
    </div>
  );
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
      className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
          : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
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

function submitFile(file: File, lang: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lang", lang);
  return fetch("/api/extract-recipe", { method: "POST", body: formData });
}

function submitJson(body: Record<string, string>) {
  return fetch("/api/extract-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
