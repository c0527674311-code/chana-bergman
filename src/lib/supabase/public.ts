import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous, cookie-free client for world-readable rows (public jobs,
 * published posts — RLS decides what "public" means). Unlike the server
 * client it never touches cookies(), so the sitemap and other cacheable
 * routes can use it. Null until Supabase is configured.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
