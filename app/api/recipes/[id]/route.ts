import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/usage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Recipe } from "@/lib/types/recipe";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ signedIn: false });
  }

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    admin
      .from("saved_recipes")
      .select("id, title, recipe, collection, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    admin.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ signedIn: true, notFound: true });
  }

  return NextResponse.json({ signedIn: true, plan: profile?.plan === "pro" ? "pro" : "free", recipe: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json()) as { recipe?: Recipe; collection?: string | null };
  if (body.recipe !== undefined && !body.recipe?.title) {
    return NextResponse.json({ error: "Invalid recipe." }, { status: 400 });
  }
  if (body.recipe === undefined && body.collection === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const update: { recipe?: Recipe; title?: string; collection?: string | null } = {};
  if (body.recipe) {
    update.recipe = body.recipe;
    update.title = body.recipe.title;
  }
  if (body.collection !== undefined) {
    update.collection = body.collection?.trim() || null;
  }

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("saved_recipes").update(update).eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("saved_recipes").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
