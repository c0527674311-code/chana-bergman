import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { saveDevSubmission } from "@/lib/dev-fallback";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const companyName = String(form.get("company_name") ?? "").trim();
  const contactName = String(form.get("contact_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const rolesWanted = String(form.get("roles_wanted") ?? "").trim();
  const attachment = form.get("attachment");

  if (!companyName) {
    return NextResponse.json({ error: "נא למלא את שם החברה." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "כתובת המייל אינה תקינה." }, { status: 400 });
  }

  const file = attachment instanceof File && attachment.size > 0 ? attachment : null;
  if (file && file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "הקובץ המצורף גדול מדי (עד 15MB)." }, { status: 400 });
  }

  const lead = {
    company_name: companyName,
    contact_name: contactName || null,
    email,
    phone: phone || null,
    roles_wanted: rolesWanted || null,
  };

  if (!adminConfigured()) {
    const saved = await saveDevSubmission("employer-lead", { ...lead, file: file?.name ?? null });
    if (saved) return NextResponse.json({ ok: true, dev: true });
    return NextResponse.json(
      { error: "המערכת עדיין לא חוברה למסד הנתונים. אנא פנו אלינו במייל." },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();

    let attachmentPath: string | null = null;
    if (file) {
      const safeName = file.name.replace(/[^\w.\-֐-׿]/g, "_");
      const path = `leads/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("requirements")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      attachmentPath = path;
    }

    const { error } = await supabase
      .from("employer_leads")
      .insert({ ...lead, attachment_path: attachmentPath });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("employer-lead failed:", err);
    return NextResponse.json(
      { error: "שמירת הפנייה נכשלה. נסו שוב, או שלחו לנו מייל ישירות." },
      { status: 500 },
    );
  }
}
