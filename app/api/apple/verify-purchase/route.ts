import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAppleIapConfigured, appleProProductId } from "@/lib/apple/config";
import { verifyAppleTransaction } from "@/lib/apple/verifyTransaction";

export const runtime = "nodejs";

/**
 * Called by the app right after StoreKit reports a successful purchase or
 * restore (see lib/nativeApp.ts purchasePro/restorePurchases). The client
 * only hands us the signed transaction — every fact we act on (product,
 * expiry, revocation) comes from re-decoding that signature here, not from
 * anything the client asserts about it.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAppleIapConfigured()) {
    return NextResponse.json({ error: "In-app purchase isn't configured yet." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const signedTransaction = body?.signedTransaction;
  if (typeof signedTransaction !== "string" || !signedTransaction) {
    return NextResponse.json({ error: "Missing signedTransaction." }, { status: 400 });
  }

  let transaction;
  try {
    transaction = await verifyAppleTransaction(signedTransaction);
  } catch (err) {
    console.error("Apple transaction verification failed", err);
    return NextResponse.json({ error: "Could not verify that purchase with Apple." }, { status: 400 });
  }

  if (transaction.productId !== appleProProductId()) {
    return NextResponse.json({ error: "Unexpected product." }, { status: 400 });
  }
  if (transaction.revocationDate) {
    return NextResponse.json({ error: "This purchase was refunded or revoked." }, { status: 400 });
  }
  if (!transaction.expiresDate || transaction.expiresDate < Date.now()) {
    return NextResponse.json({ error: "This subscription has expired." }, { status: 400 });
  }
  if (!transaction.originalTransactionId) {
    return NextResponse.json({ error: "Malformed transaction." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      plan_source: "apple",
      subscription_status: "active",
      current_period_end: new Date(transaction.expiresDate).toISOString(),
      apple_original_transaction_id: transaction.originalTransactionId,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to activate Apple subscription", error);
    return NextResponse.json({ error: "Failed to activate subscription." }, { status: 500 });
  }

  return NextResponse.json({ plan: "pro" });
}
