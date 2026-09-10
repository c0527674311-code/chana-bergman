import { NextResponse } from "next/server";
import { formatDate, storageKey } from "@/lib/utils";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { saveDevSubmission } from "@/lib/dev-fallback";
import { isIncomingPath, moveIncoming } from "@/lib/incoming";
import { notifyOwner } from "@/lib/notify";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  // Bots fill every field; people never see this one.
  if (String(form.get("company_website") ?? "").trim()) return NextResponse.json({ ok: true });
  if (rateLimited(request, "employer-lead", 10, 10 * 60_000)) {
    return NextResponse.json({ error: "יותר מדי פניות בזמן קצר. נסו שוב בעוד כמה דקות." }, { status: 429 });
  }

  const companyName = String(form.get("company_name") ?? "").trim().slice(0, 200);
  const contactName = String(form.get("contact_name") ?? "").trim().slice(0, 200);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
  const rolesWanted = String(form.get("roles_wanted") ?? "").trim().slice(0, 5000);

  if (!companyName) {
    return NextResponse.json({ error: "נא למלא את שם החברה." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "כתובת המייל אינה תקינה." }, { status: 400 });
  }

  // The browser uploads the document to Storage first (over 4.5MB a request
  // body never reaches us); a small file may still arrive attached.
  const uploadedPath = form.get("attachment_path");
  if (uploadedPath != null && uploadedPath !== "" && !isIncomingPath(uploadedPath)) {
    return NextResponse.json({ error: "הקובץ המצורף לא נמצא. נסו להעלות אותו שוב." }, { status: 400 });
  }
  const uploadedName = String(form.get("attachment_name") ?? "").trim().slice(0, 200);
  const attachment = form.get("attachment");
  const file = !isIncomingPath(uploadedPath) && attachment instanceof File && attachment.size > 0 ? attachment : null;
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
    const saved = await saveDevSubmission("employer-lead", { ...lead, file: file?.name ?? uploadedName ?? null });
    if (saved) return NextResponse.json({ ok: true, dev: true });
    return NextResponse.json(
      { error: "המערכת עדיין לא חוברה למסד הנתונים. אנא פנו אלינו במייל." },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();

    let attachmentPath: string | null = null;
    if (isIncomingPath(uploadedPath)) {
      attachmentPath = `leads/${Date.now()}-${storageKey(uploadedName || uploadedPath.split("/").pop()!)}`;
      await moveIncoming(supabase, "requirements", uploadedPath, attachmentPath);
    } else if (file) {
      const path = `leads/${Date.now()}-${storageKey(file.name)}`;
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

    await notifyOwner(
      `פנייה חדשה ממעסיק: ${companyName}`,
      [
        ["חברה", companyName],
        ["איש קשר", contactName],
        ["מייל", email],
        ["טלפון", phone],
        ["תפקידים", rolesWanted],
        ["מסמך דרישות", attachmentPath ? "צורף — אפשר להוריד ממערכת הניהול" : null],
        ["התקבלה", formatDate(new Date())],
      ],
      { replyTo: email },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("employer-lead failed:", err);
    return NextResponse.json(
      { error: "שמירת הפנייה נכשלה. נסו שוב, או שלחו לנו מייל ישירות." },
      { status: 500 },
    );
  }
}
