import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Chana records that candidates agreed to receive job offers by email.
 *
 * Imported CVs carry no consent — a file cannot say whether its owner agreed —
 * so without this every imported candidate stayed permanently unmailable.
 *
 * The filters are the guarantees, not the UI: a candidate who unsubscribed is
 * never re-consented, a row without an address is never touched, and rows that
 * already had consent keep their original consent_at.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const raw: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
  const ids = [...new Set(raw.map(String).filter((id) => UUID.test(id)))];
  if (!ids.length) {
    return NextResponse.json({ error: "לא נבחרו מועמדות." }, { status: 400 });
  }
  if (ids.length > 2000) {
    return NextResponse.json({ error: "יותר מדי מועמדות בבקשה אחת." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const updated: string[] = [];

  // PostgREST puts the id list in the URL; keep each request short.
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await admin
      .from("candidates")
      .update({ consent_marketing: true, consent_at: now })
      .in("id", chunk)
      .eq("consent_marketing", false)
      .is("unsubscribed_at", null)
      .not("email", "is", null)
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message, updated }, { status: 500 });
    }
    updated.push(...(data ?? []).map((r) => r.id as string));
  }

  if (updated.length) {
    await admin.from("activity_log").insert(
      updated.map((candidate_id) => ({
        candidate_id,
        actor: user?.id ?? null,
        kind: "consent_marked_by_admin",
        detail: { at: now },
      })),
    );
  }

  return NextResponse.json({ ok: true, updated, skipped: ids.length - updated.length });
}
