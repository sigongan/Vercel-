/**
 * Checks the parts of the session layer that don't need a database: token
 * shape and entropy, hashing, and Authorization header parsing.
 *
 * The database-backed paths (issue → resolve → revoke) are exercised against a
 * real Supabase project by `scripts/check-session-db.ts`, which needs
 * credentials; this one runs anywhere, including CI.
 *
 * Run with: `npm run check:session`
 */
import { bearerTokenFrom, __testing } from "../lib/auth/session";

const { hashToken, generateToken, TOKEN_PREFIX, tokensEqual } = __testing;

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

console.log("\nSession tokens\n");

console.log("Token shape");
const token = generateToken();
check("carries the identifying prefix", token.startsWith(TOKEN_PREFIX), `got ${token.slice(0, 12)}…`);
check(
  "is long enough to be unguessable",
  token.length - TOKEN_PREFIX.length >= 42,
  `body was ${token.length - TOKEN_PREFIX.length} chars`
);
check(
  "is URL- and header-safe",
  /^[A-Za-z0-9_-]+$/.test(token.slice(TOKEN_PREFIX.length)),
  `body was ${token.slice(TOKEN_PREFIX.length)}`
);

console.log("\nEntropy");
const many = new Set(Array.from({ length: 20_000 }, () => generateToken()));
check("20,000 tokens are all distinct", many.size === 20_000, `got ${many.size} unique`);
check("two fresh tokens never match", !tokensEqual(generateToken(), generateToken()));

console.log("\nHashing");
const hash = hashToken(token);
check("is deterministic", hash === hashToken(token));
check("is a hex sha256", /^[0-9a-f]{64}$/.test(hash), `got ${hash}`);
check("differs for a different token", hash !== hashToken(generateToken()));
check("does not contain the token", !hash.includes(token.slice(TOKEN_PREFIX.length, 20)));
// A one-character change must scatter the hash, or near-miss tokens would be
// distinguishable from wildly wrong ones.
check("changes completely for a near-identical token", hashToken(`${token}x`) !== hash);

console.log("\nAuthorization header parsing");
check("reads a normal bearer header", bearerTokenFrom(`Bearer ${token}`) === token);
check("accepts lowercase scheme", bearerTokenFrom(`bearer ${token}`) === token);
check("tolerates surrounding whitespace", bearerTokenFrom(`  Bearer   ${token}  `) === token);
check("rejects a missing header", bearerTokenFrom(null) === null);
check("rejects an empty header", bearerTokenFrom("") === null);
check("rejects a bare token with no scheme", bearerTokenFrom(token) === null);
check("rejects a different scheme", bearerTokenFrom(`Basic ${token}`) === null);
check("rejects Bearer with nothing after it", bearerTokenFrom("Bearer") === null);
check("rejects Bearer with only spaces after it", bearerTokenFrom("Bearer    ") === null);

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
