import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import { appleBundleId } from "@/lib/apple/config";

/**
 * Verifies the identity token Sign in with Apple hands back, against Apple's
 * own public keys.
 *
 * This is the trust boundary of the whole auth system: everything downstream
 * treats `appleSub` as proof of who the caller is, so a flaw here is a full
 * account takeover. Every check below is therefore explicit and fails closed —
 * an unverifiable token is rejected, never downgraded to "probably fine".
 */

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

/**
 * Apple signs identity tokens with RS256 and rotates the signing key. Pinning
 * the algorithm matters: without it, a forged token could name a symmetric
 * algorithm (HS256) and trick a verifier into validating the signature with
 * the *public* key as an HMAC secret — the classic algorithm-confusion
 * takeover. `jose` requires the caller to state the expected algorithm, and
 * this is that statement.
 */
const APPLE_SIGNING_ALGORITHM = "RS256";

/**
 * Module-level so the fetched key set survives between requests on a warm
 * serverless instance. `createRemoteJWKSet` handles the parts that are easy to
 * get wrong by hand: caching, re-fetching when Apple rotates to a `kid` we
 * haven't seen, and a cooldown so an unknown `kid` can't be used to hammer
 * Apple's endpoint.
 */
const appleJwks = createRemoteJWKSet(APPLE_JWKS_URL);

/** What we're willing to believe about a caller after verification. */
export interface AppleIdentity {
  /**
   * Apple's stable identifier for this user *for this app*. The value we key
   * accounts on — it never changes for a given user, and unlike email it can't
   * be changed or reused.
   */
  appleSub: string;
  /**
   * Apple omits this on repeat sign-ins, and users may relay a private
   * address. Callers must persist it on first sight rather than expecting it
   * every time — overwriting a stored email with `undefined` on the second
   * sign-in is the classic bug here.
   */
  email?: string;
  emailVerified: boolean;
  /** True when the address is an Apple private relay (`@privaterelay.appleid.com`). */
  isPrivateEmail: boolean;
}

export type AppleTokenErrorCode =
  | "MALFORMED"
  | "SIGNATURE_INVALID"
  | "EXPIRED"
  | "WRONG_AUDIENCE"
  | "WRONG_ISSUER"
  | "NONCE_MISMATCH"
  | "MISSING_SUBJECT"
  | "KEY_FETCH_FAILED";

export class AppleTokenError extends Error {
  constructor(
    readonly code: AppleTokenErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "AppleTokenError";
  }
}

export interface VerifyOptions {
  /**
   * The *raw* nonce the client generated for this sign-in. The client sent
   * SHA-256 of it to Apple, so Apple echoes the hash back in the token; we
   * hash what the client tells us and compare. This binds the token to one
   * specific sign-in attempt, so a token captured elsewhere can't be replayed
   * against us.
   */
  expectedRawNonce?: string;
}

/**
 * Bundle ID for the iOS app; Services ID for the web flow, if one is ever
 * configured. Listing both lets one verifier serve both surfaces — the point
 * of the check is "issued for us", not "issued for iOS".
 */
function acceptedAudiences(): string[] {
  const audiences = [appleBundleId()];
  const servicesId = process.env.APPLE_SERVICES_ID;
  if (servicesId) audiences.push(servicesId);
  return audiences;
}

/**
 * Apple sends `email_verified` and `is_private_email` as either a real boolean
 * or the *strings* `"true"`/`"false"`, inconsistently and without notice. A
 * bare truthiness check would read the string `"false"` as true, so both
 * shapes are normalized here.
 */
function appleBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return false;
}

/**
 * Compared without early exit so the time taken doesn't reveal how much of the
 * value matched. Overkill for a value the client already knows, but the cost
 * is nil and it keeps the habit consistent across the auth code.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself leak length;
  // checking first and returning the same way for every mismatch avoids that.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  options: VerifyOptions = {}
): Promise<AppleIdentity> {
  return verifyAgainstKeySet(identityToken, appleJwks, options);
}

/**
 * The real verification, with the key source as a parameter so the check
 * script can drive it with a locally generated key pair. Not exported
 * directly — production has exactly one legitimate key source, and making it
 * an argument at the module boundary would invite passing another.
 */
async function verifyAgainstKeySet(
  identityToken: string,
  keySet: Parameters<typeof jwtVerify>[1],
  options: VerifyOptions
): Promise<AppleIdentity> {
  if (!identityToken || typeof identityToken !== "string") {
    throw new AppleTokenError("MALFORMED", "No identity token was supplied.");
  }

  // Read outside the try below on purpose. `acceptedAudiences` throws a plain
  // Error when APPLE_BUNDLE_ID is missing — a deployment mistake, not
  // anything about the token — and that try exists to translate *token*
  // failures. A config error caught there would fall through to the generic
  // MALFORMED case and read as "the client sent garbage" in the logs, which
  // sends whoever's debugging looking at the wrong end of the system
  // entirely. Left uncaught here, it surfaces as an unhandled 500 instead,
  // which is what a missing deployment variable actually is.
  const audiences = acceptedAudiences();

  let payload;
  try {
    // jose verifies the signature and the registered claims (`iss`, `aud`,
    // `exp`, `nbf`) in one pass; anything it can't verify throws.
    ({ payload } = await jwtVerify(identityToken, keySet, {
      algorithms: [APPLE_SIGNING_ALGORITHM],
      issuer: APPLE_ISSUER,
      audience: audiences,
      // Apple's tokens are short-lived by design. A little tolerance absorbs
      // ordinary clock skew between Apple's servers and ours without
      // meaningfully widening the window a stolen token stays usable.
      clockTolerance: "30s",
    }));
  } catch (error) {
    throw translateJoseError(error);
  }

  const appleSub = payload.sub;
  if (!appleSub) {
    // Every real Apple token has one; its absence means we're looking at
    // something we don't understand, so refuse rather than invent an identity.
    throw new AppleTokenError("MISSING_SUBJECT", "Apple token carried no subject claim.");
  }

  verifyNonce(payload.nonce, options.expectedRawNonce);

  const email = typeof payload.email === "string" ? payload.email : undefined;

  return {
    appleSub,
    email,
    emailVerified: appleBoolean(payload.email_verified),
    isPrivateEmail: appleBoolean(payload.is_private_email),
  };
}

/**
 * Fails closed in both directions: a token carrying a nonce we can't check is
 * as suspect as a nonce that doesn't match. The only accepted case where
 * neither side has one is a flow that never used a nonce at all.
 */
function verifyNonce(tokenNonce: unknown, expectedRawNonce?: string): void {
  const hasTokenNonce = typeof tokenNonce === "string" && tokenNonce.length > 0;

  if (!expectedRawNonce) {
    if (hasTokenNonce) {
      throw new AppleTokenError(
        "NONCE_MISMATCH",
        "Token was bound to a nonce but the client sent none to check it against."
      );
    }
    return;
  }

  if (!hasTokenNonce) {
    throw new AppleTokenError(
      "NONCE_MISMATCH",
      "Client supplied a nonce but the token was not bound to one."
    );
  }

  // The client hashed the nonce before handing it to Apple, so Apple echoes
  // the hash. Hash the raw value the same way to compare like with like.
  const expectedHash = createHash("sha256").update(expectedRawNonce).digest("hex");
  if (!constantTimeEquals(expectedHash, tokenNonce as string)) {
    throw new AppleTokenError("NONCE_MISMATCH", "Token nonce did not match this sign-in attempt.");
  }
}

/**
 * Maps jose's failures onto our own codes so callers can respond usefully —
 * an expired token deserves "try again", a bad signature does not.
 */
function translateJoseError(error: unknown): AppleTokenError {
  if (error instanceof joseErrors.JWTExpired) {
    return new AppleTokenError("EXPIRED", "Apple token has expired.", { cause: error });
  }
  if (error instanceof joseErrors.JWTClaimValidationFailed) {
    if (error.claim === "aud") {
      return new AppleTokenError("WRONG_AUDIENCE", "Apple token was issued for another app.", {
        cause: error,
      });
    }
    if (error.claim === "iss") {
      return new AppleTokenError("WRONG_ISSUER", "Apple token was not issued by Apple.", {
        cause: error,
      });
    }
    return new AppleTokenError("MALFORMED", `Apple token claim '${error.claim}' is invalid.`, {
      cause: error,
    });
  }
  if (error instanceof joseErrors.JWSSignatureVerificationFailed) {
    return new AppleTokenError("SIGNATURE_INVALID", "Apple token signature did not verify.", {
      cause: error,
    });
  }
  if (
    error instanceof joseErrors.JWKSNoMatchingKey ||
    error instanceof joseErrors.JWKSMultipleMatchingKeys ||
    error instanceof joseErrors.JWKSTimeout
  ) {
    // Distinct from a bad signature: Apple's keys were unreachable or didn't
    // contain the one this token names. Retryable, and worth alerting on —
    // a bad signature is one user, this is potentially everyone.
    return new AppleTokenError("KEY_FETCH_FAILED", "Could not obtain Apple's signing key.", {
      cause: error,
    });
  }
  if (error instanceof joseErrors.JWSInvalid || error instanceof joseErrors.JWTInvalid) {
    return new AppleTokenError("MALFORMED", "Identity token is not a well-formed JWT.", {
      cause: error,
    });
  }
  return new AppleTokenError("MALFORMED", "Apple token could not be verified.", { cause: error });
}

/**
 * Exported strictly so `scripts/check-apple-token.ts` can exercise the real
 * verification against a key pair it generates itself. Application code must
 * use `verifyAppleIdentityToken` — the guarantee this module makes is that
 * production trusts Apple's keys and nothing else.
 */
export const __testing = { verifyAgainstKeySet };
