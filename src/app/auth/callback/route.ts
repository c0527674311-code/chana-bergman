import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/utils";

/**
 * Only a path on this site. `//evil.com` and `/\evil.com` start with a slash
 * but a browser reads them as another host, which made this callback an open
 * redirect behind the real login page.
 */
function safeNext(raw: string | null, origin: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/profile";
  try {
    return new URL(raw, origin).origin === origin ? raw : "/profile";
  } catch {
    return "/profile";
  }
}

/** Google OAuth landing point: exchanges the code for a session cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), url.origin);

  if (!supabaseConfigured || !code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureAppUser(user);
    // An address only counts once the provider has verified it.
    const email = user.email_confirmed_at ? normalizeEmail(user.email) : null;
    if (email) {
      await claimAdminInvite(user.id, email);
      await linkCandidate(user.id, email);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

/**
 * Ensure an app_users row exists so the admin flag has somewhere to live.
 *
 * This used to write with the signing-in user's own session, but app_users
 * has no INSERT policy, so the row was never created and an invited team
 * member could never be promoted. It is written with the service role.
 */
async function ensureAppUser(user: User) {
  const row = {
    id: user.id,
    email: user.email ?? "",
    first_name: (user.user_metadata?.first_name as string) ?? null,
    last_name: (user.user_metadata?.last_name as string) ?? null,
  };
  try {
    const client = adminConfigured() ? createAdminClient() : await createClient();
    const { error } = await client
      .from("app_users")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.error("app_users upsert failed:", error);
  } catch (err) {
    console.error("app_users upsert failed:", err);
  }
}

/**
 * Turns an invite Chana wrote into real access.
 *
 * She approves an email before that person has ever signed in, so there is no
 * user row to flag at the time. The first Google sign-in with that address is
 * where the two halves meet.
 *
 * This runs with the service role on purpose: the person signing in is not an
 * admin yet, so RLS would (correctly) hide `admin_invites` from their own
 * session and the invite would never be found.
 */
async function claimAdminInvite(userId: string, email: string) {
  if (!adminConfigured()) return;

  try {
    const admin = createAdminClient();
    const { data: invite } = await admin
      .from("admin_invites")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!invite) return;

    const { data: promoted, error } = await admin
      .from("app_users")
      .update({ is_admin: true })
      .eq("id", userId)
      .select("id");
    // Marking the invite accepted when no row changed hid the failure from the team screen.
    if (error || !promoted?.length) {
      console.error("admin invite claim updated no row:", email, error);
      return;
    }
    await admin
      .from("admin_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("email", email);
  } catch (err) {
    // Never block a legitimate sign-in over this — she can re-grant from the
    // team screen, and the person is simply not an admin until then.
    console.error("admin invite claim failed:", email, err);
  }
}

/**
 * Connects a candidate record to the account that proved it owns the address.
 * Nothing set candidates.user_id before, so "הפרופיל שלי" never found anyone.
 */
async function linkCandidate(userId: string, email: string) {
  if (!adminConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: linked } = await admin
      .from("candidates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (linked) return;

    await admin
      .from("candidates")
      .update({ user_id: userId })
      .eq("email_key", email)
      .is("user_id", null)
      .is("deleted_at", null);
  } catch (err) {
    console.error("candidate link failed:", email, err);
  }
}
