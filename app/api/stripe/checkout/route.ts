import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { CREDIT_PACK_SIZE, CREDIT_PACK_PRICE_USD } from "@/lib/billingConstants";

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

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: CREDIT_PACK_PRICE_USD * 100,
            product_data: {
              name: `${CREDIT_PACK_SIZE} avocados 🥑 (recipe extractions)`,
            },
          },
        },
      ],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe credit-pack checkout session creation failed", err);
    const message = err instanceof Error ? err.message : "Failed to start checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
