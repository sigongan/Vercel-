"use client";

import { useCallback, useState } from "react";
import type { ExtractRecipeResult, Recipe } from "@/lib/types/recipe";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { prefetchSocialCaption } from "@/lib/socialPrefetch";
import { hapticTap, hapticSuccess, hapticError } from "@/lib/nativeApp";
import { addRecentRecipe } from "@/lib/recentRecipes";

/**
 * The extraction request/response cycle, shared by every surface that can
 * start one: the Extract tab's full three-tab form, and Home's one-tap
 * shortcut. Both need the same loading/error/result states and the same
 * quirks (social-caption prefetch, non-JSON error handling, recent-recipe
 * bookkeeping), so they run the same code rather than two drifting copies.
 */

export type ExtractionInput =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

export interface ExtractionError {
  message: string;
  code?: string;
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

export function useExtraction() {
  const { language } = useLanguage();
  const t = translations[language];

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<ExtractionError | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const startExtraction = useCallback(
    async (input: ExtractionInput) => {
      setStatus("loading");
      setError(null);
      setRecipe(null);
      hapticTap();

      try {
        let response: Response;
        if (input.kind === "file") {
          response = await submitFile(input.file, language);
        } else if (input.kind === "url") {
          // Inside the iOS app, fetch social captions from the device first —
          // Instagram blocks the server's requests but not a real phone's
          // (lib/socialPrefetch.ts). Null on the website / non-social links.
          const prefetched = await prefetchSocialCaption(input.url);
          response = await submitJson({
            url: input.url,
            lang: language,
            ...(prefetched ? { prefetched } : {}),
          });
        } else {
          response = await submitJson({ text: input.text, lang: language });
        }

        const rawBody = await response.text();
        let data: ExtractRecipeResult;
        try {
          data = JSON.parse(rawBody);
        } catch {
          console.error("extract-recipe: non-JSON response", response.status, rawBody.slice(0, 500));
          throw new Error(
            response.status === 504 || response.status === 408 ? "TIMEOUT" : `HTTP_${response.status}`,
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
    },
    [language, t],
  );

  const reset = useCallback(() => {
    setRecipe(null);
    setError(null);
    setStatus("idle");
  }, []);

  const errorMessage = error
    ? error.code && error.code in t.errors
      ? t.errors[error.code as keyof typeof t.errors]
      : error.message
    : null;

  return { status, error, errorMessage, recipe, setRecipe, setError, setStatus, startExtraction, reset };
}
