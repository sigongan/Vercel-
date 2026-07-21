import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAppleIapConfigured } from "@/lib/apple/config";
import { verifyAppleNotification, verifyAppleTransaction } from "@/lib/apple/verifyTransaction";
import { NotificationTypeV2 } from "@apple/app-store-server-library";

export const runtime = "nodejs";

/**
 * App Store Server Notifications V2 endpoint — register this URL in App
 * Store Connect (App Information → App Store Server Notifications). Apple
 * calls it on every subscription lifecycle event (renewal, cancellation,
 * refund, billing failure, ...), which is how plan/subscription_status
 * stay correct even when the app isn't open, the same job the Stripe
 * webhook does for web subscribers.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAppleIapConfigured()) {
    return NextResponse.json({ error: "In-app purchase isn't configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const signedPayload = body?.signedPayload;
  if (typeof signedPayload !== "string" || !signedPayload) {
    return NextResponse.json({ error: "Missing signedPayload." }, { status: 400 });
  }

  let notification;
  try {
    notification = await verifyAppleNotification(signedPayload);
  } catch (err) {
    console.error("Apple notification verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const signedTransactionInfo = notification.data?.signedTransactionInfo;
  if (!signedTransactionInfo) {
    // Notifications without transaction info (e.g. metadata/consent
    // events) don't affect plan state — nothing to do.
    return NextResponse.json({ received: true });
  }

  let transaction;
  try {
    transaction = await verifyAppleTransaction(signedTransactionInfo);
  } catch (err) {
    console.error("Apple notification's embedded transaction failed verification", err);
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  }

  if (!transaction.originalTransactionId) {
    return NextResponse.json({ received: true });
  }

  const admin = createSupabaseAdminClient();
  const ACTIVE_EVENTS: string[] = [
    NotificationTypeV2.SUBSCRIBED,
    NotificationTypeV2.DID_RENEW,
    NotificationTypeV2.RENEWAL_EXTENDED,
    NotificationTypeV2.RENEWAL_EXTENSION,
    NotificationTypeV2.REFUND_REVERSED,
  ];
  const INACTIVE_EVENTS: string[] = [
    NotificationTypeV2.EXPIRED,
    NotificationTypeV2.REVOKE,
    NotificationTypeV2.REFUND,
    NotificationTypeV2.GRACE_PERIOD_EXPIRED,
  ];

  try {
    if (ACTIVE_EVENTS.includes(notification.notificationType ?? "")) {
      const { error } = await admin
        .from("profiles")
        .update({
          plan: "pro",
          plan_source: "apple",
          subscription_status: "active",
          current_period_end: transaction.expiresDate ? new Date(transaction.expiresDate).toISOString() : null,
        })
        .eq("apple_original_transaction_id", transaction.originalTransactionId);
      if (error) throw error;
    } else if (INACTIVE_EVENTS.includes(notification.notificationType ?? "")) {
      const { error } = await admin
        .from("profiles")
        .update({ plan: "free", subscription_status: notification.notificationType?.toLowerCase() })
        .eq("apple_original_transaction_id", transaction.originalTransactionId);
      if (error) throw error;
    }
    // Every other notification type (price changes, renewal-preference
    // changes while still active, etc.) doesn't need a plan change here.
  } catch (err) {
    console.error(`Apple notification handler failed for ${notification.notificationType}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
