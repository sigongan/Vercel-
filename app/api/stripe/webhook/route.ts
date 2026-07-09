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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (userId) {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: CREDIT_PACK_SIZE,
      });
      if (error) {
        console.error("Failed to add credits after checkout", error);
        return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
