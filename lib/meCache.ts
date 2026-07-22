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

/** Marks the cache signed-out (used right after sign-out) so the next
 *  mount — even a fresh app launch — renders the sign-in row immediately
 *  instead of a loading skeleton while /api/me confirms it. */
export function clearCachedMe() {
  setCachedMe({ signedIn: false });
}

/** Fetches fresh /api/me and updates the cache. Never throws.
 *  Caches signedIn:false too — not just the signed-in case — so a
 *  signed-out visitor gets the sign-in row instantly on their next visit
 *  instead of a loading skeleton every single time. */
export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const body: MeResponse = await res.json();
    setCachedMe(body);
    return body;
  } catch {
    return null;
  }
}
