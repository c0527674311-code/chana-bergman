import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saved group-mail templates. Every campaign Chana sends is saved here under
 * its subject, so the next one starts from what she already wrote instead of
 * from a blank page.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) return NextResponse.json({ templates: [] });

  const { data, error } = await createAdminClient()
    .from("email_templates")
    .select("id, name, subject, body, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 120);
  const subject = String(body?.subject ?? "").trim().slice(0, 300);
  const text = String(body?.body ?? "").trim().slice(0, 20_000);
  if (!name || !subject || !text) {
    return NextResponse.json({ error: "חסרים שם, נושא או תוכן." }, { status: 400 });
  }

  const admin = createAdminClient();
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  // Same name = the same template, updated.
  const { data: existing } = await admin
    .from("email_templates")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  const { data, error } = existing
    ? await admin
        .from("email_templates")
        .update({ subject, body: text, updated_at: now })
        .eq("id", existing.id)
        .select("id, name, subject, body, updated_at")
        .single()
    : await admin
        .from("email_templates")
        .insert({ name, subject, body: text, created_by: user?.id ?? null })
        .select("id, name, subject, body, updated_at")
        .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, template: data });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });

  const { error } = await createAdminClient().from("email_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
