/**
 * Exercises the Apple identity token verifier against a locally generated key
 * pair — including the forgeries it exists to reject.
 *
 * There's no test runner in this project, so this follows the existing
 * `tsx scripts/…` convention. Run with: `npm run check:apple-token`
 *
 * The signing keys here are generated fresh each run and never leave the
 * process; nothing in this file touches Apple or any real credential.
 */
import { createHash, createHmac } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, base64url } from "jose";
import { AppleTokenError, __testing, type AppleTokenErrorCode } from "../lib/auth/appleToken";

const ISSUER = "https://appleid.apple.com";
const BUNDLE_ID = "app.avocato.ios";
const KID = "test-key-1";
const SUBJECT = "001234.abcdef.1234";

process.env.APPLE_BUNDLE_ID = BUNDLE_ID;

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed += 1;
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}

function bad(name: string, detail: string) {
  failed += 1;
  console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${detail}`);
}

async function expectRejected(name: string, code: AppleTokenErrorCode, run: () => Promise<unknown>) {
  try {
    await run();
    bad(name, `Expected rejection with ${code}, but the token was ACCEPTED.`);
  } catch (error) {
    if (error instanceof AppleTokenError && error.code === code) ok(name);
    else if (error instanceof AppleTokenError) bad(name, `Expected ${code}, got ${error.code} (${error.message})`);
    else bad(name, `Expected AppleTokenError(${code}), got ${String(error)}`);
  }
}

async function expectAccepted<T>(name: string, run: () => Promise<T>, check?: (value: T) => string | null) {
  try {
    const value = await run();
    const problem = check?.(value);
    if (problem) bad(name, problem);
    else ok(name);
  } catch (error) {
    bad(name, `Expected acceptance, got ${String(error)}`);
  }
}

async function main() {
  // Two key pairs: the one "Apple" signs with, and one an attacker holds.
  const apple = await generateKeyPair("RS256", { extractable: true });
  const attacker = await generateKeyPair("RS256", { extractable: true });

  const applePublicJwk = { ...(await exportJWK(apple.publicKey)), kid: KID, alg: "RS256", use: "sig" };
  const keySet = createLocalJWKSet({ keys: [applePublicJwk] });

  const verify = (token: string, expectedRawNonce?: string) =>
    __testing.verifyAgainstKeySet(token, keySet, { expectedRawNonce });

  const nowSeconds = () => Math.floor(Date.now() / 1000);

  /**
   * Mints a token that is valid in every respect unless a case overrides
   * something. Claims are applied last so a case can genuinely replace `iss`,
   * `aud`, or `sub` rather than have the defaults win.
   */
  function mint(
    claims: Record<string, unknown> = {},
    opts: { key?: CryptoKey; expiresAt?: number } = {}
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      iss: ISSUER,
      aud: BUNDLE_ID,
      sub: SUBJECT,
      iat: nowSeconds(),
      exp: opts.expiresAt ?? nowSeconds() + 600,
      email_verified: true,
      ...claims,
    };
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .sign(opts.key ?? apple.privateKey);
  }

  const rawNonce = "a-random-value-the-client-made-up";
  const hashedNonce = createHash("sha256").update(rawNonce).digest("hex");

  console.log("\nApple identity token verifier\n");

  console.log("Accepts legitimate tokens");
  await expectAccepted(
    "valid token returns the Apple subject",
    async () => verify(await mint({ email: "chef@example.com" })),
    (id) => (id.appleSub === SUBJECT ? null : `got appleSub ${id.appleSub}`)
  );

  await expectAccepted("valid token with a matching nonce", async () =>
    verify(await mint({ nonce: hashedNonce }), rawNonce)
  );

  await expectAccepted(
    "email absent on repeat sign-in is not an error",
    async () => verify(await mint()),
    (id) => (id.email === undefined ? null : `expected no email, got ${id.email}`)
  );

  console.log("\nNormalizes Apple's inconsistent claim types");
  await expectAccepted(
    'string "false" is not read as true',
    async () => verify(await mint({ email_verified: "false", is_private_email: "false" })),
    (id) =>
      !id.emailVerified && !id.isPrivateEmail
        ? null
        : `got emailVerified=${id.emailVerified} isPrivateEmail=${id.isPrivateEmail}`
  );

  await expectAccepted(
    'string "true" is read as true',
    async () => verify(await mint({ email_verified: "true", is_private_email: "true" })),
    (id) =>
      id.emailVerified && id.isPrivateEmail
        ? null
        : `got emailVerified=${id.emailVerified} isPrivateEmail=${id.isPrivateEmail}`
  );

  console.log("\nRejects forgeries");
  await expectRejected("token signed by someone else", "SIGNATURE_INVALID", async () =>
    verify(await mint({}, { key: attacker.privateKey }))
  );

  // The algorithm-confusion attack: re-sign the token with HS256, using the
  // public key as the HMAC secret. A verifier that trusts the header's `alg`
  // would accept this from anyone, since the public key is public by design.
  await expectRejected("HS256 forgery using the public key as the secret", "MALFORMED", async () => {
    const header = base64url.encode(JSON.stringify({ alg: "HS256", kid: KID }));
    const body = base64url.encode(
      JSON.stringify({ iss: ISSUER, aud: BUNDLE_ID, sub: "attacker", exp: nowSeconds() + 600 })
    );
    const secret = Buffer.from(JSON.stringify(applePublicJwk));
    const signature = base64url.encode(createHmac("sha256", secret).update(`${header}.${body}`).digest());
    return verify(`${header}.${body}.${signature}`);
  });

  await expectRejected("unsigned token claiming alg=none", "MALFORMED", async () => {
    const header = base64url.encode(JSON.stringify({ alg: "none" }));
    const body = base64url.encode(
      JSON.stringify({ iss: ISSUER, aud: BUNDLE_ID, sub: "attacker", exp: nowSeconds() + 600 })
    );
    return verify(`${header}.${body}.`);
  });

  await expectRejected("token issued for a different app", "WRONG_AUDIENCE", async () =>
    verify(await mint({ aud: "com.someone.else" }))
  );

  await expectRejected("token from a different issuer", "WRONG_ISSUER", async () =>
    verify(await mint({ iss: "https://evil.example.com" }))
  );

  await expectRejected("expired token", "EXPIRED", async () =>
    verify(await mint({}, { expiresAt: nowSeconds() - 3600 }))
  );

  await expectRejected("token with no subject", "MISSING_SUBJECT", async () => {
    const { sub, ...withoutSub } = {
      sub: SUBJECT,
      iss: ISSUER,
      aud: BUNDLE_ID,
      iat: nowSeconds(),
      exp: nowSeconds() + 600,
    };
    void sub;
    return verify(
      await new SignJWT(withoutSub).setProtectedHeader({ alg: "RS256", kid: KID }).sign(apple.privateKey)
    );
  });

  await expectRejected("not a JWT at all", "MALFORMED", async () => verify("hello"));
  await expectRejected("empty token", "MALFORMED", async () => verify(""));

  console.log("\nBinds the token to one sign-in attempt (nonce)");
  await expectRejected("nonce that doesn't match", "NONCE_MISMATCH", async () =>
    verify(await mint({ nonce: hashedNonce }), "a-different-nonce")
  );

  await expectRejected("token carries a nonce the client can't vouch for", "NONCE_MISMATCH", async () =>
    verify(await mint({ nonce: hashedNonce }))
  );

  await expectRejected("client expects a nonce the token doesn't carry", "NONCE_MISMATCH", async () =>
    verify(await mint(), rawNonce)
  );

  await expectRejected("client sent the nonce unhashed", "NONCE_MISMATCH", async () =>
    verify(await mint({ nonce: rawNonce }), rawNonce)
  );

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
