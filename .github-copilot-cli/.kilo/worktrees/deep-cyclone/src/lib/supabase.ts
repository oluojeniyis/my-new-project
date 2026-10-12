import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function createClientSideSupabase() {
  const { url, anonKey, configured } = getSupabaseConfig();

  if (!configured) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
