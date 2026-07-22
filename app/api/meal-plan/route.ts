import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Per-user session state — must never be served from a shared cache. See
// app/api/me/route.ts for why this matters.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function noStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rolling 7-day window starting today, in the server's local date — the
 *  meal plan is "this week from now", not a fixed Mon–Sun calendar week. */
function weekDates(): string[] {
  const dates: string[] = [];
  const start = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return noStore({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return noStore({ signedIn: false });
  }

  const admin = createSupabaseAdminClient();
  const dates = weekDates();
  const [{ data: profile }, { data: entries, error }] = await Promise.all([
    admin.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    admin
      .from("meal_plan")
      .select("plan_date, saved_recipe_id, saved_recipes(title)")
      .eq("user_id", user.id)
      .in("plan_date", dates),
  ]);

  if (error) {
    return noStore({ error: error.message }, { status: 500 });
  }

  const plan = profile?.plan === "pro" ? "pro" : "free";
  return noStore({
    signedIn: true,
    plan,
    dates,
    entries:
      plan === "pro"
        ? (entries ?? []).map((e) => ({
            planDate: e.plan_date as string,
            savedRecipeId: e.saved_recipe_id as string,
            title: (e.saved_recipes as unknown as { title: string } | null)?.title ?? "",
          }))
        : [],
  });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profile?.plan !== "pro") {
    return NextResponse.json({ error: "Pro subscription required." }, { status: 402 });
  }

  const body = (await request.json().catch(() => null)) as
    | { planDate?: string; savedRecipeId?: string }
    | null;
  const planDate = body?.planDate;
  const savedRecipeId = body?.savedRecipeId;
  if (!planDate || !DATE_RE.test(planDate) || !savedRecipeId) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  // One recipe per day — replace whatever was already planned for this date.
  await admin.from("meal_plan").delete().eq("user_id", user.id).eq("plan_date", planDate);
  const { error } = await admin
    .from("meal_plan")
    .insert({ user_id: user.id, plan_date: planDate, saved_recipe_id: savedRecipeId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const planDate = request.nextUrl.searchParams.get("date");
  if (!planDate || !DATE_RE.test(planDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("meal_plan")
    .delete()
    .eq("user_id", user.id)
    .eq("plan_date", planDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
