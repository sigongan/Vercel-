import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for privileged writes (usage counters, credit grants)
 * that must bypass Row Level Security. Server-only — never import from
 * client components. Throws if called without the service role key set,
 * since callers only reach this once isSupabaseConfigured() has gated them.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role client requested without SUPABASE_SERVICE_ROLE_KEY set.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
