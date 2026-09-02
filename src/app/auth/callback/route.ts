import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/utils";

/** Google OAuth landing point: exchanges the code for a session cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/profile";

  if (!supabaseConfigured || !code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  // Ensure an app_users row exists so the admin flag has somewhere to live.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("app_users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        first_name: (user.user_metadata?.first_name as string) ?? null,
        last_name: (user.user_metadata?.last_name as string) ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

    await claimAdminInvite(user.id, user.email);
  }

  return NextResponse.redirect(new URL(next, url.origin));
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
async function claimAdminInvite(userId: string, rawEmail: string | undefined) {
  const email = normalizeEmail(rawEmail ?? "");
  if (!email || !adminConfigured()) return;

  try {
    const admin = createAdminClient();
    const { data: invite } = await admin
      .from("admin_invites")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!invite) return;

    await admin.from("app_users").update({ is_admin: true }).eq("id", userId);
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
