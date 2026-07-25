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
 * Recipe Scanner (web search) is the most expensive thing the app does —
 * each uncached query pays a per-search fee to the AI's web-search tool on
 * top of tokens (~$0.028/query measured; see docs/cost-notes.md), and unlike
 * extraction it earns nothing on its own. So it's a Pro feature with a free
 * taste rather than a free unlimited one: enough to show what Recipe Scout
 * does and let someone decide it's worth paying for, not enough for the
 * feature to run up an unbounded bill for anonymous traffic.
 *
 * Applies to everyone without an active Pro plan, signed in or not.
 */
export const FREE_SEARCH_DAILY_LIMIT = 3;

/**
 * Pro accounts get a higher, account-scoped daily ceiling instead of the
 * shared per-IP caps above — still a backstop against a compromised/shared
 * paid account, just generous enough that a real subscriber never hits it
 * from normal use (and never shares a cap with strangers on the same wifi).
 */
export const PRO_SEARCH_DAILY_LIMIT = 100;
export const PRO_TEXT_DAILY_LIMIT = 150;

/** "My Recipes" — save/organize extracted recipes. */
export const SUBSCRIPTION_PRICE_USD = 4;
