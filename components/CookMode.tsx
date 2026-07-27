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

/**
 * One per step that has a started timer. Timers are owned by CookMode (not
 * the per-step view), so several can run at once — start "simmer 10 min",
 * move on to prep the next step, and the countdown keeps going, shown as a
 * tappable chip. endAt-based rather than tick-decrement so background tabs
 * and re-renders can't drift the clock.
 */
interface StepTimerState {
  duration: number;
  /** Epoch ms when the countdown hits zero; null while paused or done. */
  endAt: number | null;
  /** Seconds left, meaningful while paused (endAt is the truth while running). */
  remaining: number;
  done: boolean;
}

function secondsLeftOf(state: StepTimerState, now: number): number {
  return state.endAt !== null ? Math.max(0, Math.ceil((state.endAt - now) / 1000)) : state.remaining;
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
  const [timers, setTimers] = useState<Record<number, StepTimerState>>({});
  const [now, setNow] = useState(() => Date.now());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const touchStartX = useRef<number | null>(null);

  const step = steps[index];
  const duration = step ? parseDurationSeconds(step.instruction) : null;

  const anyRunning = Object.values(timers).some((st) => st.endAt !== null);

  const timersRef = useRef(timers);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // Single shared clock for every running timer; the same tick rings any
  // timer crossing zero — including ones on steps the cook has already
  // moved past.
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => {
      const nowMs = Date.now();
      setNow(nowMs);
      const ts = timersRef.current;
      const finished = Object.keys(ts)
        .map(Number)
        .filter((k) => ts[k].endAt !== null && (ts[k].endAt as number) - nowMs <= 0);
      if (finished.length === 0) return;
      try {
        navigator.vibrate?.(400);
      } catch {
        // vibration unsupported — ignore
      }
      // navigator.vibrate is a no-op inside the native WKWebView — this is
      // the reliable path there, alongside the web fallback above.
      hapticSuccess();
      endCookTimerActivity();
      setTimers((prev) => {
        const next = { ...prev };
        for (const k of finished) {
          if (next[k]) next[k] = { ...next[k], endAt: null, remaining: 0, done: true };
        }
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [anyRunning]);

  // All navigation funnels through here: a finished timer's chip has done
  // its job once the cook lands back on that step, so clear it on arrival
  // and let the step offer a fresh start.
  const goTo = useCallback((target: number) => {
    hapticTap();
    setTimers((ts) => {
      if (!ts[target]?.done) return ts;
      const next = { ...ts };
      delete next[target];
      return next;
    });
    setIndex(target);
  }, []);

  const goNext = useCallback(() => {
    goTo(Math.min(index + 1, steps.length - 1));
  }, [goTo, index, steps.length]);
  const goPrev = useCallback(() => {
    goTo(Math.max(index - 1, 0));
  }, [goTo, index]);

  function activityInfoFor(stepIndex: number) {
    return {
      recipeTitle: recipe.title,
      stepNumber: stepIndex + 1,
      totalSteps: steps.length,
      stepText: steps[stepIndex]?.instruction ?? "",
    };
  }

  function handleTimerButton() {
    if (duration === null) return;
    hapticTap();
    const existing = timers[index];
    if (!existing || existing.done) {
      // Fresh start (or restart after finishing).
      setTimers((ts) => ({
        ...ts,
        [index]: { duration, endAt: Date.now() + duration * 1000, remaining: duration, done: false },
      }));
      setNow(Date.now());
      syncCookTimerActivity({ ...activityInfoFor(index), remainingSeconds: duration, paused: false });
    } else if (existing.endAt !== null) {
      const remaining = secondsLeftOf(existing, Date.now());
      setTimers((ts) => ({ ...ts, [index]: { ...existing, endAt: null, remaining } }));
      syncCookTimerActivity({ ...activityInfoFor(index), remainingSeconds: remaining, paused: true });
    } else {
      setTimers((ts) => ({
        ...ts,
        [index]: { ...existing, endAt: Date.now() + existing.remaining * 1000 },
      }));
      setNow(Date.now());
      syncCookTimerActivity({ ...activityInfoFor(index), remainingSeconds: existing.remaining, paused: false });
    }
  }

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
      // Never strand a countdown on the Dynamic Island after leaving.
      endCookTimerActivity();
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

  const currentTimer = timers[index];
  const currentSecondsLeft = currentTimer ? secondsLeftOf(currentTimer, now) : (duration ?? 0);
  const timerLabel = !currentTimer || currentTimer.done
    ? t.cookModeTimerStart
    : currentTimer.endAt !== null
      ? t.cookModeTimerPause
      : t.cookModeTimerResume;

  // Timers still going (or just finished) on steps other than the one on
  // screen — shown as chips so nothing runs invisibly.
  const otherTimers = Object.keys(timers)
    .map(Number)
    .filter((i) => i !== index && (timers[i].endAt !== null || timers[i].done))
    .sort((a, b) => a - b);

  // Rendered via a portal straight onto <body> — CookMode's siblings use
  // CSS animations that leave a lingering `transform` after they finish
  // (needed to keep the animation's final frame), which creates a new
  // containing block for any `position: fixed` descendant and would
  // otherwise shrink this overlay down to that ancestor's box instead of
  // the real viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#181C12] text-[#FAFAF7]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          aria-label={t.cookModeExit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#E8EBE2] transition-colors hover:bg-white/20"
        >
          <CloseIcon />
        </button>
        <p className="flex-1 truncate text-center text-sm font-medium text-[#DDE3D3]">{recipe.title}</p>
        <button
          onClick={() => setShowIngredients((s) => !s)}
          className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-[#E8EBE2] transition-colors hover:bg-white/20"
        >
          {t.cookModeIngredients}
        </button>
      </div>

      <div className="flex gap-1 px-4 sm:px-6" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.order}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? "bg-[#61A00E]" : "bg-white/15"}`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BC926]">
          {t.cookModeStepOf(index + 1, steps.length)}
        </span>
        <p className="max-w-xl text-2xl sm:text-4xl leading-snug font-medium">{step.instruction}</p>

        {duration !== null && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl sm:text-5xl font-semibold tabular-nums">
              {formatClock(currentSecondsLeft)}
            </span>
            <button
              onClick={handleTimerButton}
              className="rounded-full bg-gradient-to-br from-[#4D7C0F] to-[#5E7A33] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {timerLabel}
            </button>
          </div>
        )}
      </div>

      {otherTimers.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 px-4 sm:px-6 pb-2">
          {otherTimers.map((i) => {
            const st = timers[i];
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                  st.done
                    ? "bg-[#8BC926] text-[#181C12] animate-pulse"
                    : "bg-white/10 text-[#E8EBE2] hover:bg-white/20"
                }`}
              >
                <TimerIcon />
                {t.cookModeTimerChip(steps[i]?.order ?? i + 1)}
                <span>{st.done ? "0:00" : formatClock(secondsLeftOf(st, now))}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 px-4 sm:px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex-1 rounded-full border border-white/20 py-3 text-sm font-medium text-[#E8EBE2] transition-colors hover:border-white/40 disabled:opacity-30"
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
            className="flex-1 rounded-full bg-gradient-to-br from-[#4D7C0F] to-[#5E7A33] py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {t.cookModeNext}
          </button>
        )}
      </div>

      {showIngredients && (
        <div className="absolute inset-x-0 bottom-0 max-h-[65vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#252B1D] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#DDE3D3]">{t.ingredients}</h3>
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
                className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2.5 text-sm text-[#E8EBE2]"
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

function TimerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </svg>
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
