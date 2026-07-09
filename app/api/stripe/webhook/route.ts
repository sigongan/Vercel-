import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CREDIT_PACK_SIZE } from "@/lib/billingConstants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  if (!userId) return;

  const admin = createSupabaseAdminClient();

  if (session.mode === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!subscriptionId || !customerId) return;

    const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);

    const { error } = await admin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        plan: isActivePlan(subscription.status) ? "pro" : "free",
        current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Failed to activate subscription after checkout", error);
      throw error;
    }
    return;
  }

  // One-time credit pack purchase.
  const { error } = await admin.rpc("add_credits", { p_user_id: userId, p_amount: CREDIT_PACK_SIZE });
  if (error) {
    console.error("Failed to add credits after checkout", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: subscription.status,
      plan: isActivePlan(subscription.status) ? "pro" : "free",
      current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Failed to sync subscription update", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ subscription_status: "canceled", plan: "free" })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Failed to sync subscription deletion", error);
    throw error;
  }
}

function isActivePlan(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}
