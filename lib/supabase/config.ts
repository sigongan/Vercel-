// All three are required for the gated path (auth check, quota RPC, cache all
// need the service-role key). Treating a partial configuration as "configured"
// used to send requests down the gated path and crash on the missing key —
// now a partial config just runs ungated, like no config at all.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
