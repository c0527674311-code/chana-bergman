import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { saveDevSubmission } from "@/lib/dev-fallback";
import { INQUIRY_COMPANY } from "@/lib/leads";
import { notifyOwner } from "@/lib/notify";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * General inquiries from the homepage "שאלות?" form.
 *
 * Stored in employer_leads with a fixed company marker so they surface in the
 * same back-office inbox as employer leads — both mean "someone is waiting
 * for a reply" — and announced to Chana by email.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });

  // Bots fill every field; people never see this one. A hit is saved anyway
  // (the browser's autofill reached this field once and a real enquiry was
  // lost) — it just doesn't send Chana an email.
  const suspectedSpam = Boolean(String(form.get("company_website") ?? "").trim());
  if (rateLimited(request, "inquiry", 10, 10 * 60_000)) {
    return NextResponse.json({ error: "יותר מדי פניות בזמן קצר. נסי שוב בעוד כמה דקות." }, { status: 429 });
  }

  const firstName = String(form.get("first_name") ?? "").trim().slice(0, 100);
  const lastName = String(form.get("last_name") ?? "").trim().slice(0, 100);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
  const message = String(form.get("message") ?? "").trim().slice(0, 5000);

  if (!firstName) return NextResponse.json({ error: "נא למלא שם פרטי." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "כתובת המייל אינה תקינה." }, { status: 400 });
  }
  if (!message) return NextResponse.json({ error: "נא לכתוב את תוכן הפנייה." }, { status: 400 });

  const record = {
    company_name: INQUIRY_COMPANY,
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

    if (suspectedSpam) {
      console.warn("inquiry tripped the spam field, saved without notifying:", email);
      return NextResponse.json({ ok: true });
    }

    await notifyOwner(
      `שאלה חדשה מהאתר: ${record.contact_name}`,
      [
        ["שם", record.contact_name],
        ["מייל", email],
        ["טלפון", phone],
        ["הפנייה", message],
      ],
      { replyTo: email },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("inquiry failed:", err);
    return NextResponse.json({ error: "השליחה נכשלה. נסי שוב מאוחר יותר." }, { status: 500 });
  }
}
