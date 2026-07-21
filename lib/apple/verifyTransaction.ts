import { readFileSync } from "fs";
import { join } from "path";
import { SignedDataVerifier, Environment } from "@apple/app-store-server-library";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { appleBundleId, appleAppAppleId, appleEnvironment } from "./config";

const CERTS_DIR = join(process.cwd(), "lib", "apple", "certs");

// Downloaded once from the Apple PKI site (public files, not secrets) — see
// lib/apple/certs/README.md. Loaded lazily so a deploy without them yet
// doesn't crash routes that don't need IAP.
let cachedRootCerts: Buffer[] | null = null;

function loadRootCertificates(): Buffer[] {
  if (cachedRootCerts) return cachedRootCerts;
  const files = ["AppleRootCA-G3.cer"];
  cachedRootCerts = files.map((f) => readFileSync(join(CERTS_DIR, f)));
  return cachedRootCerts;
}

let cachedVerifier: SignedDataVerifier | null = null;

function getVerifier(): SignedDataVerifier {
  if (cachedVerifier) return cachedVerifier;
  const environment = appleEnvironment();
  cachedVerifier = new SignedDataVerifier(
    loadRootCertificates(),
    // Online revocation/expiry checks need outbound network from the
    // server at verify time — fine for a Vercel function, matches Apple's
    // own recommended default.
    true,
    environment === "Production" ? Environment.PRODUCTION : Environment.SANDBOX,
    appleBundleId(),
    appleAppAppleId(),
  );
  return cachedVerifier;
}

/** Verifies a signedTransaction (StoreKit 2's Transaction.jwsRepresentation)
 *  actually came from Apple and returns its decoded contents. Throws if the
 *  signature, bundle ID, or environment don't check out. */
export async function verifyAppleTransaction(
  signedTransaction: string,
): Promise<JWSTransactionDecodedPayload> {
  return getVerifier().verifyAndDecodeTransaction(signedTransaction);
}

/** Same, for an App Store Server Notifications V2 payload. */
export async function verifyAppleNotification(signedPayload: string) {
  return getVerifier().verifyAndDecodeNotification(signedPayload);
}
