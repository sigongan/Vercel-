"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Recipe, RecipeStep } from "@/lib/types/recipe";
import type { Translation } from "@/lib/i18n";
import {
  nativeKeepAwake,
  hapticTap,
  hapticSuccess,
  syncCookTimerActivity,
  endCookTimerActivity,
} from "@/lib/nativeApp";

/** Best-effort duration hint from an instruction, e.g. "simmer for 10-12 minutes". */
function parseDurationSeconds(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:[-–to]+\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/i);
  if (!match) return null;
  const low = parseInt(match[1], 10);
  const high = match[2] ? parseInt(match[2], 10) : low;
  const n = Math.round((low + high) / 2);
  const unit = match[3].toLowerCase();
  if (unit.startsWith("hour") || unit.startsWith("hr")) return n * 3600;
  if (unit.startsWith("min")) return n * 60;
  return n;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CookMode({
  recipe,
  steps,
  t,
  onClose,
}: {
  recipe: Recipe;
  steps: RecipeStep[];
  t: Translation;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const touchStartX = useRef<number | null>(null);

  const step = steps[index];
  const duration = step ? parseDurationSeconds(step.instruction) : null;

  const goNext = useCallback(() => {
    hapticTap();
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);
  const goPrev = useCallback(() => {
    hapticTap();
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keep the screen awake for as long as Cook Mode is open. The native app
  // (nativeKeepAwake) is the reliable path inside the Capacitor WKWebView,
  // where the web Wake Lock API is spotty; both run so the plain website
  // keeps working the same as before on real browsers.
  useEffect(() => {
    let cancelled = false;

    async function requestLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Unsupported or denied — Cook Mode still works, the screen may just sleep.
      }
    }

    requestLock();
    nativeKeepAwake(true);

    function handleVisibility() {
      if (document.visibilityState === "visible" && !cancelled) requestLock();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      nativeKeepAwake(false);
    };
  }, []);

  // Keyboard navigation + lock body scroll while Cook Mode is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [goNext, goPrev, onClose]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }

  if (!step) return null;

  // Rendered via a portal straight onto <body> — CookMode's siblings use
  // CSS animations that leave a lingering `transform` after they finish
  // (needed to keep the animation's final frame), which creates a new
  // containing block for any `position: fixed` descendant and would
  // otherwise shrink this overlay down to that ancestor's box instead of
  // the real viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#1E2A1B] text-[#F7F5EF]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          aria-label={t.cookModeExit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#DCE6D3] transition-colors hover:bg-white/20"
        >
          <CloseIcon />
        </button>
        <p className="flex-1 truncate text-center text-sm font-medium text-[#D2DEC8]">{recipe.title}</p>
        <button
          onClick={() => setShowIngredients((s) => !s)}
          className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-[#DCE6D3] transition-colors hover:bg-white/20"
        >
          {t.cookModeIngredients}
        </button>
      </div>

      <div className="flex gap-1 px-4 sm:px-6" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.order}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? "bg-[#5B8A52]" : "bg-white/15"}`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9CC28C]">
          {t.cookModeStepOf(index + 1, steps.length)}
        </span>
        <p className="max-w-xl text-2xl sm:text-4xl leading-snug font-medium">{step.instruction}</p>

        {duration !== null && (
          <StepTimer
            key={index}
            duration={duration}
            t={t}
            activityInfo={{
              recipeTitle: recipe.title,
              stepNumber: index + 1,
              totalSteps: steps.length,
              stepText: step.instruction,
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3 px-4 sm:px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex-1 rounded-full border border-white/20 py-3 text-sm font-medium text-[#DCE6D3] transition-colors hover:border-white/40 disabled:opacity-30"
        >
          {t.cookModePrev}
        </button>
        {index === steps.length - 1 ? (
          <button
            onClick={() => {
              hapticSuccess();
              onClose();
            }}
            className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            {t.cookModeDone}
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 rounded-full bg-gradient-to-br from-[#9CC28C] to-[#5B8A52] py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {t.cookModeNext}
          </button>
        )}
      </div>

      {showIngredients && (
        <div className="absolute inset-x-0 bottom-0 max-h-[65vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#2f221b] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#D2DEC8]">{t.ingredients}</h3>
            <button
              onClick={() => setShowIngredients(false)}
              aria-label={t.cookModeExit}
              className="text-[#8A9880] transition-colors hover:text-white"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <ul className="flex flex-col gap-2.5">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2.5 text-sm text-[#DCE6D3]"
              >
                <span>{ing.name}</span>
                {ing.amount && <span className="shrink-0 tabular-nums text-[#8A9880]">{ing.amount}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * Owns its own countdown state, keyed by step index in the parent so that
 * switching steps remounts (and resets) it instead of needing a reset
 * effect that synchronously calls setState.
 */
function StepTimer({
  duration,
  t,
  activityInfo,
}: {
  duration: number;
  t: Translation;
  activityInfo: {
    recipeTitle: string;
    stepNumber: number;
    totalSteps: number;
    stepText: string;
  };
}) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => Math.max(s - 1, 0)), 1000);
    return () => clearTimeout(id);
  }, [timerRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    try {
      navigator.vibrate?.(400);
    } catch {
      // vibration unsupported — ignore
    }
    // navigator.vibrate is a no-op inside the native WKWebView — this is
    // the reliable path there, alongside the web fallback above.
    hapticSuccess();
    endCookTimerActivity();
    // Fires once, when the countdown reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft === 0]);

  // Leaving the step (or Cook Mode entirely) with a timer on the Dynamic
  // Island would strand a stale countdown there — always clear it.
  useEffect(() => {
    return () => {
      endCookTimerActivity();
    };
  }, []);

  function handleClick() {
    hapticTap();
    if (secondsLeft <= 0) {
      setSecondsLeft(duration);
      setTimerRunning(true);
      syncCookTimerActivity({ ...activityInfo, remainingSeconds: duration, paused: false });
    } else {
      // Live Activity sync only on transitions (start/pause/resume) — iOS
      // animates the running countdown itself, no per-second updates.
      const pausing = timerRunning;
      setTimerRunning((r) => !r);
      syncCookTimerActivity({ ...activityInfo, remainingSeconds: secondsLeft, paused: pausing });
    }
  }

  const label =
    secondsLeft <= 0
      ? t.cookModeTimerStart
      : timerRunning
        ? t.cookModeTimerPause
        : secondsLeft < duration
          ? t.cookModeTimerResume
          : t.cookModeTimerStart;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-4xl sm:text-5xl font-semibold tabular-nums">{formatClock(secondsLeft)}</span>
      <button
        onClick={handleClick}
        className="rounded-full bg-gradient-to-br from-[#9CC28C] to-[#5B8A52] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      >
        {label}
      </button>
    </div>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
