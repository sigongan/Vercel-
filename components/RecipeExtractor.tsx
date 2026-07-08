"use client";

import { useRef, useState } from "react";
import type { ExtractRecipeResult, Recipe } from "@/lib/types/recipe";
import { RecipeCard } from "./RecipeCard";

type Tab = "file" | "url";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm";

export function RecipeExtractor() {
  const [tab, setTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = tab === "file" ? Boolean(file) : url.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "loading") return;

    setStatus("loading");
    setErrorMessage(null);
    setRecipe(null);

    try {
      const res =
        tab === "file"
          ? await submitFile(file as File)
          : await submitUrl(url.trim());

      const data: ExtractRecipeResult = await res.json();

      if (data.ok) {
        setRecipe(data.recipe);
        setStatus("idle");
      } else {
        setErrorMessage(data.error.error);
        setStatus("error");
      }
    } catch {
      setErrorMessage("요청 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setStatus("error");
    }
  }

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-8">
      <div className="w-full flex rounded-full border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/30 p-1">
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          📸 파일 업로드
        </TabButton>
        <TabButton active={tab === "url"} onClick={() => setTab("url")}>
          🔗 링크 붙여넣기
        </TabButton>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
        {tab === "file" ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 py-12 px-6 flex flex-col items-center gap-3 text-center cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-4xl">🖼️</span>
            <span className="text-lg font-semibold text-amber-950 dark:text-amber-100">
              {file ? file.name : "파일을 여기에 드래그하거나 클릭"}
            </span>
            <span className="text-sm text-amber-700 dark:text-amber-300">
              스크린샷, PDF, 동영상 파일 지원
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-amber-900 dark:text-amber-100">
              레시피 링크
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... 또는 구글 Docs 링크"
              className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950 px-4 py-3 text-sm placeholder-amber-400 dark:placeholder-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || status === "loading"}
          className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          {status === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block animate-spin">⏳</span>
              레시피 추출 중...
            </span>
          ) : (
            "✨ 레시피 추출하기"
          )}
        </button>
      </form>

      {status === "error" && errorMessage && (
        <div className="w-full rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-200">❌ {errorMessage}</p>
        </div>
      )}

      {recipe && <RecipeCard recipe={recipe} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
          : "text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
      }`}
    >
      {children}
    </button>
  );
}

function submitFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetch("/api/extract-recipe", { method: "POST", body: formData });
}

function submitUrl(url: string) {
  return fetch("/api/extract-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}
