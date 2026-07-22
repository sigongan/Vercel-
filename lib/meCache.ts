"use client";

/**
 * Session-lifetime cache for /api/me — Profile and Home both need this on
 * every mount (Profile for the account row, Home for the "Hi, {name}"
 * greeting) and previously re-fetched from scratch each time, showing a
 * loading skeleton or a nameless header for a beat even when nothing had
 * changed since the last visit. Callers render the cached value immediately
 * if there is one, then silently refetch to correct it — sessionStorage
 * (not localStorage) so a stale sign-out/sign-in on a shared device doesn't
 * leak across app restarts.
 */

export interface MeResponse {
  signedIn: boolean;
  email?: string;
  name?: string | null;
  credits?: number;
  free_used_this_period?: number;
  plan?: string;
}

const KEY = "avocato:me-cache";

export function getCachedMe(): MeResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MeResponse) : null;
  } catch {
    return null;
  }
}

function setCachedMe(data: MeResponse) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, quota) — just skip caching.
  }
}

export function clearCachedMe() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Fetches fresh /api/me and updates the cache. Never throws. */
export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const body: MeResponse = await res.json();
    if (body.signedIn) setCachedMe(body);
    else clearCachedMe();
    return body;
  } catch {
    return null;
  }
}
