import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Server-only — never import from a "use client" module.
 *
 * Anonymous CV submissions and the employer contact form write through this so
 * that dedup, validation and rate limiting happen in our code rather than
 * being exposed as a public INSERT policy on the table.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "חסרות הגדרות Supabase: NEXT_PUBLIC_SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function adminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
