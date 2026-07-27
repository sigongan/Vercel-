import { createServerClient } from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

/** Server-side client scoped to the current request's session (route handlers, server components). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component render — middleware refreshes the session instead
          }
        },
      },
    }
  );
}

/**
 * Resolves the caller's Supabase user from either auth scheme.
 *
 * The web app authenticates with SSR cookies, which a native app can't use —
 * there's no cookie jar shared with a Swift URLSession, and Supabase's own
 * mobile SDKs are token-based anyway. So a native client sends
 * `Authorization: Bearer <access_token>` instead, and this checks for that
 * first, falling back to cookies when it's absent.
 *
 * The bearer path validates the JWT against the auth server on every call
 * (`getUser(token)`) rather than decoding it locally — a locally-decoded JWT
 * would still look valid after the user signed out or the token was revoked.
 */
export async function getSupabaseUser(): Promise<User | null> {
  const bearer = (await headers()).get("authorization");

  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7).trim();
    if (!token) return null;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    return user ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
