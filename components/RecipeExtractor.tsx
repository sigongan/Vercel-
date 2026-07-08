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
    <div className="w-full max-w-2xl flex flex-col items-center gap-6">
      <div className="w-full flex rounded-full border border-black/10 dark:border-white/15 p-1">
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          파일 업로드
        </TabButton>
        <TabButton active={tab === "url"} onClick={() => setTab("url")}>
          링크 붙여넣기
        </TabButton>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        {tab === "file" ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-black/15 dark:border-white/20 py-10 px-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:border-black/30 dark:hover:border-white/40 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm font-medium">
              {file ? file.name : "이미지, PDF, 동영상 파일을 선택하세요"}
            </span>
            <span className="text-xs text-black/50 dark:text-white/50">
              스크린샷, 캡처 이미지, PDF 레시피, 저장한 영상 파일 등
            </span>
          </div>
        ) : (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... 또는 인스타그램/틱톡 링크"
            className="w-full rounded-xl border border-black/15 dark:border-white/20 px-4 py-3 text-sm bg-transparent outline-none focus:border-black/40 dark:focus:border-white/50"
          />
        )}

        <button
          type="submit"
          disabled={!canSubmit || status === "loading"}
          className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "레시피 추출 중..." : "레시피 추출하기"}
        </button>
      </form>

      {status === "error" && errorMessage && (
        <p className="w-full text-sm text-red-600 dark:text-red-400 text-center">{errorMessage}</p>
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
      className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-black/60 dark:text-white/60"
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
