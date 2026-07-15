"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtractRecipeResult, Recipe } from "@/lib/types/recipe";
import { RecipeCard } from "./RecipeCard";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { compressImageFile } from "@/lib/compressImage";
import { AvocadoMark } from "@/lib/avocadoMark";
import { SOURCE_ICONS } from "@/components/SourceIcons";

type Tab = "file" | "url" | "text";

interface SubmitError {
  message: string;
  code?: string;
}

const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm";

/** Canned demo shown by "See an example recipe" — no AI call, no quota used. */
const EXAMPLE_RECIPE: Recipe = {
  title: "15-Minute Garlic Butter Shrimp Pasta",
  description:
    "A weeknight favorite — juicy shrimp in a silky garlic butter sauce, finished with lemon and parsley.",
  servings: "2 servings",
  prepTime: "5 min",
  cookTime: "10 min",
  ingredients: [
    { name: "spaghetti", amount: "200g" },
    { name: "shrimp, peeled & deveined", amount: "250g" },
    { name: "butter", amount: "3 tbsp" },
    { name: "garlic, minced", amount: "4 cloves" },
    { name: "chili flakes", amount: "1/2 tsp", estimated: true },
    { name: "lemon", amount: "1/2" },
    { name: "fresh parsley, chopped", amount: "2 tbsp", estimated: true },
    { name: "salt & black pepper", amount: "to taste" },
  ],
  steps: [
    {
      order: 1,
      instruction:
        "Cook spaghetti in well-salted water until al dente. Reserve a cup of pasta water.",
    },
    {
      order: 2,
      instruction:
        "Melt butter in a large pan over medium heat. Add garlic and chili flakes; cook 30 seconds until fragrant.",
    },
    {
      order: 3,
      instruction: "Add shrimp and cook 1–2 minutes per side until just pink.",
    },
    {
      order: 4,
      instruction:
        "Toss in the pasta with a splash of pasta water; swirl until the sauce turns glossy.",
    },
    {
      order: 5,
      instruction:
        "Finish with lemon juice and parsley. Season and serve immediately.",
    },
  ],
  tags: ["pasta", "seafood", "quick", "weeknight"],
  confidence: "high",
  sourceType: "text",
  notes:
    "This is a sample recipe so you can explore the card styles, editing, and printing — extract your own to see the magic on real sources.",
};

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
        : text.trim().length > 0;

  const errorMessage = error
    ? language === "en" && error.code && error.code in t.errors
      ? t.errors[error.code as keyof typeof t.errors]
      : error.message
    : null;

  async function startExtraction(
    input:
      | { kind: "file"; file: File }
      | { kind: "url"; url: string }
      | { kind: "text"; text: string },
  ) {
    setStatus("loading");
    setError(null);
    setRecipe(null);

    try {
      const response = await (input.kind === "file"
        ? submitFile(input.file, language)
        : input.kind === "url"
          ? submitJson({ url: input.url, lang: language })
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "loading") return;
    if (tab === "file")
      return startExtraction({ kind: "file", file: file as File });
    if (tab === "url") return startExtraction({ kind: "url", url: url.trim() });
    return startExtraction({ kind: "text", text: text.trim() });
  }

  if (recipe) {
    return (
      <div className="relative z-[1] w-full max-w-3xl flex flex-col gap-4 animate-fade-in-up">
        <button
          type="button"
          onClick={backToStart}
          className="self-start flex items-center gap-1.5 text-sm font-medium text-[#c98a6f] hover:text-[#7a4a3a] dark:hover:text-stone-200 transition-colors"
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
        <p className="text-base sm:text-lg text-[#a97e6b] dark:text-stone-400 leading-relaxed max-w-xl">
          {t.tagline}
        </p>
        <ul className="flex flex-wrap justify-center gap-2 mt-1">
          {t.sources.map((source) => (
            <li
              key={source}
              className="flex items-center gap-1.5 text-xs font-medium text-[#a97e6b] dark:text-stone-400 bg-white dark:bg-stone-900/70 shadow-[0_2px_8px_rgba(180,120,90,0.10)] dark:shadow-none border border-transparent dark:border-stone-800 rounded-full pl-2.5 pr-3 py-1"
            >
              {SOURCE_ICONS[source]}
              {source}
            </li>
          ))}
        </ul>
      </header>

      <div className="w-full max-w-2xl rounded-[32px] border border-transparent dark:border-stone-800 bg-white dark:bg-stone-900 shadow-[0_10px_34px_rgba(190,130,100,0.14)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-5 sm:p-7 flex flex-col gap-5">
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-4 py-14 animate-fade-in-up">
            <div className="animate-avocado-spin">
              <AvocadoMark size={56} />
            </div>
            <p className="text-sm font-medium text-[#a97e6b] dark:text-stone-400">
              {t.extracting}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-[#fbeee6] dark:bg-stone-800 p-1">
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
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {tab === "file" && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) handleFileSelected(dropped);
                  }}
                  className="rounded-[24px] border-2 border-dashed border-[#f0d2c0] dark:border-stone-700 bg-[#fef8f4] dark:bg-stone-950/40 py-12 px-6 flex flex-col items-center gap-3 text-center cursor-pointer transition-colors hover:border-[#e0785680] hover:bg-[#fbeee6] dark:hover:bg-stone-800/50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    className="hidden"
                    onChange={(e) =>
                      handleFileSelected(e.target.files?.[0] ?? null)
                    }
                  />
                  <span className="flex items-center justify-center w-13 h-13 rounded-full bg-[#fbe4d5] dark:bg-stone-800 text-[#c98a6f] dark:text-stone-400">
                    <UploadIcon size={22} />
                  </span>
                  {preparingFile ? (
                    <span className="text-sm text-[#a97e6b] dark:text-stone-400">
                      {t.preparingFile}
                    </span>
                  ) : file ? (
                    <span className="flex items-center gap-2 text-sm font-medium text-[#7a4a3a] dark:text-stone-200">
                      {file.name}
                      <span className="text-[#c3a08d] font-normal">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        aria-label={t.clearFile}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className="text-[#c3a08d] hover:text-[#7a4a3a] dark:hover:text-stone-200 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <>
                      <span className="text-[15px] font-medium text-[#7a4a3a] dark:text-stone-200">
                        {t.uploadTitle}
                      </span>
                      <span className="text-xs text-[#c3a08d]">
                        {t.uploadHint}
                      </span>
                    </>
                  )}
                </div>
              )}

              {tab === "url" && (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[#7a4a3a] dark:text-stone-300">
                    {t.urlLabel}
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t.urlPlaceholder}
                    className="w-full rounded-xl border border-[#f0d2c0] dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-[#6b4a3f] dark:text-stone-100 placeholder-[#c3a08d] dark:placeholder-stone-600 outline-none transition-shadow focus:border-[#e07856] focus:ring-4 focus:ring-[#e07856]/10 dark:focus:ring-stone-100/5"
                  />
                </label>
              )}

              {tab === "text" && (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[#7a4a3a] dark:text-stone-300">
                    {t.textLabel}
                  </span>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t.textPlaceholder}
                    rows={8}
                    className="w-full resize-y rounded-xl border border-[#f0d2c0] dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm leading-relaxed text-[#6b4a3f] dark:text-stone-100 placeholder-[#c3a08d] dark:placeholder-stone-600 outline-none transition-shadow focus:border-[#e07856] focus:ring-4 focus:ring-[#e07856]/10 dark:focus:ring-stone-100/5"
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-full bg-gradient-to-br from-[#f3a480] to-[#e07856] text-white dark:bg-stone-100 dark:text-stone-900 py-3.5 text-[15px] font-semibold shadow-[0_8px_20px_rgba(224,120,86,0.35)] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {t.extract}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setRecipe(EXAMPLE_RECIPE);
                setError(null);
                setStatus("idle");
              }}
              className="self-center text-xs font-medium text-[#c98a6f] hover:text-[#7a4a3a] dark:hover:text-stone-200 underline underline-offset-2"
            >
              ✨ {t.tryExample}
            </button>
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
      className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-white dark:bg-stone-900 text-[#b5573b] dark:text-stone-100 shadow-[0_2px_8px_rgba(180,120,90,0.15)]"
          : "text-[#b48a76] hover:text-[#7a4a3a] dark:hover:text-stone-300"
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

function submitJson(body: Record<string, string>) {
  return fetch("/api/extract-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
