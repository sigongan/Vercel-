import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { SUBSCRIPTION_PRICE_USD } from "@/lib/billingConstants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: SUBSCRIPTION_PRICE_USD * 100,
          recurring: { interval: "month" },
          product_data: {
            name: "My Recipes — save and organize extracted recipes",
          },
        },
      },
    ],
    success_url: `${origin}/recipes?subscribed=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
