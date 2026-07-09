import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Recipe } from "@/lib/types/recipe";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("saved_recipes")
    .select("id, title, recipe, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipes: data ?? [] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.plan !== "pro") {
    return NextResponse.json({ error: "Pro subscription required." }, { status: 402 });
  }

  const body = (await request.json()) as { recipe: Recipe };
  if (!body.recipe?.title) {
    return NextResponse.json({ error: "Invalid recipe." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("saved_recipes")
    .insert({ user_id: user.id, recipe: body.recipe, title: body.recipe.title })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
