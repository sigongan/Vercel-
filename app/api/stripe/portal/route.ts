import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/recipes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe billing portal session creation failed", err);
    const message = err instanceof Error ? err.message : "Failed to open billing portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
