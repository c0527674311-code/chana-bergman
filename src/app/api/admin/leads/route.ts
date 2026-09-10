import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marks an employer lead or inquiry as handled (or back to open). */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!UUID.test(id) || typeof body?.handled !== "boolean") {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("employer_leads")
    .update({ handled: body.handled })
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "הפנייה לא נמצאה." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
