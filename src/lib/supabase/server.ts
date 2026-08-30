import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True once the project is wired to a Supabase instance. Until then the site
 * still renders — public pages fall back to sample content so the design can
 * be reviewed before the backend exists.
 */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the middleware refreshes the
          // session instead, so this is safe to swallow.
        }
      },
    },
  });
}

/** Current signed-in user plus the admin flag, or null. */
export async function getCurrentUser() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("first_name, last_name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    isAdmin: profile?.is_admin ?? false,
  };
}
