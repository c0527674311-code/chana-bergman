import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { saveDevSubmission } from "@/lib/dev-fallback";

export const runtime = "nodejs";

/**
 * General inquiries from the homepage "שאלות?" form.
 *
 * Stored in employer_leads with a fixed company marker so they surface in the
 * same back-office inbox Chana already checks — a general inquiry and an
 * employer lead both mean "someone is waiting for a reply".
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });

  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const message = String(form.get("message") ?? "").trim().slice(0, 5000);

  if (!firstName) return NextResponse.json({ error: "נא למלא שם פרטי." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "כתובת המייל אינה תקינה." }, { status: 400 });
  }
  if (!message) return NextResponse.json({ error: "נא לכתוב את תוכן הפנייה." }, { status: 400 });

  const record = {
    company_name: "פנייה כללית מהאתר",
    contact_name: [firstName, lastName].filter(Boolean).join(" "),
    email,
    phone: phone || null,
    roles_wanted: message,
  };

  if (!adminConfigured()) {
    const saved = await saveDevSubmission("inquiry", record);
    if (saved) return NextResponse.json({ ok: true, dev: true });
    return NextResponse.json(
      { error: "המערכת עדיין לא חוברה למסד הנתונים. אנא כתבי לנו מייל." },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("employer_leads").insert(record);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("inquiry failed:", err);
    return NextResponse.json({ error: "השליחה נכשלה. נסי שוב מאוחר יותר." }, { status: 500 });
  }
}
