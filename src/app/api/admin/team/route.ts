import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Back-office team management.
 *
 * Two things make up "who can get in": people who already have an account and
 * carry `app_users.is_admin`, and emails Chana has approved but who have not
 * signed in yet (`admin_invites`). The UI shows both, because from her side
 * they are the same act — "I gave this person access".
 */

/** Both lists, so the screen can show pending invites next to active members. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const admin = createAdminClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    admin
      .from("app_users")
      .select("id, email, first_name, last_name, is_admin")
      .eq("is_admin", true)
      .order("email"),
    admin.from("admin_invites").select("email, created_at, accepted_at").order("email"),
  ]);

  const memberEmails = new Set((members ?? []).map((m) => (m.email ?? "").toLowerCase()));

  return NextResponse.json({
    members: members ?? [],
    // An invite whose owner has already signed in is just noise on the screen.
    invites: (invites ?? []).filter((i) => !memberEmails.has(i.email)),
  });
}

/** Grant access to an email — immediately if they exist, on first sign-in if not. */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(String(body?.email ?? ""));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "כתובת המייל אינה תקינה." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Who is doing the inviting — recorded so the list is auditable later.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await admin
    .from("app_users")
    .select("id, is_admin")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.is_admin) {
      return NextResponse.json({ ok: true, alreadyAdmin: true });
    }
    const { error } = await admin
      .from("app_users")
      .update({ is_admin: true })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, granted: "existing" });
  }

  const { error } = await admin
    .from("admin_invites")
    .upsert({ email, invited_by: user?.id ?? null }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, granted: "invited" });
}

/** Revoke access. Removes the admin flag and any pending invite for that email. */
export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(String(body?.email ?? ""));
  if (!email) return NextResponse.json({ error: "חסר מייל." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Locking yourself out of the only admin account is not a recoverable mistake
  // from inside the app, so refuse it outright.
  if (user?.email && normalizeEmail(user.email) === email) {
    return NextResponse.json(
      { error: "אי אפשר להסיר את ההרשאות של עצמך." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);
  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "זו המנהלת האחרונה — צריך להשאיר לפחות אחת." },
      { status: 400 },
    );
  }

  await admin.from("app_users").update({ is_admin: false }).eq("email", email);
  await admin.from("admin_invites").delete().eq("email", email);

  return NextResponse.json({ ok: true });
}
