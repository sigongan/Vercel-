export const FREE_MONTHLY_LIMIT = 5;
export const CREDIT_PACK_SIZE = 20;
export const CREDIT_PACK_PRICE_USD = 3;

/** Free tries for anonymous (not-signed-in) visitors, tracked via a signed cookie — no account needed. */
export const ANON_FREE_LIMIT = 1;
export const ANON_COOKIE_NAME = "rx_anon";

/**
 * Pasted-text extraction is free and unlimited for everyone; this per-IP
 * daily cap exists only as an abuse/cost backstop, set well above what any
 * real user pastes by hand in a day.
 */
export const TEXT_DAILY_IP_LIMIT = 30;

/**
 * "What should I eat today?" photo suggestions are unmetered (no sign-in,
 * no monthly cap) same as text — this per-IP daily cap is the same kind of
 * abuse/cost backstop as TEXT_DAILY_IP_LIMIT, just lower since a vision
 * call costs more per request than a text one.
 */
export const PHOTO_DAILY_IP_LIMIT = 20;

/**
 * Recipe Scanner (web search) — each query runs real web searches through
 * the AI, which costs noticeably more than a plain extraction, so the daily
 * per-IP backstop is tighter still.
 */
export const SEARCH_DAILY_IP_LIMIT = 15;

/** "My Recipes" — save/organize extracted recipes. */
export const SUBSCRIPTION_PRICE_USD = 4;
