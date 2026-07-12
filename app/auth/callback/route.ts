import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Most commonly: the sign-in link was opened in a different browser (or
      // an email client pre-fetched it) than the one that requested it, so
      // the PKCE code verifier cookie doesn't match. Surface it instead of
      // silently landing back on "/" looking signed out with no explanation.
      console.error("magic link exchange failed", error);
      return NextResponse.redirect(new URL("/?authError=1", request.url));
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
