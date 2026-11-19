import { NextResponse } from "next/server";
import { brandedEmailHtml, escapeHtml, siteUrl } from "@/lib/email-brand";
import { isValidEmail, mailProvider, sendEmail } from "@/lib/mailer";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Under the 4.5MB request limit of the host, and well under the mail provider's. */
const MAX_PDF_BYTES = 4 * 1024 * 1024;

/**
 * Sends the CV she just built to the email address written in it.
 *
 * Only to that address, with fixed wording: the endpoint is open to anyone,
 * and a free-form recipient and message would make it a way to send mail from
 * Chana's domain to anyone. The message looks like every other email from
 * Chana (logo, CV-builder card), with the PDF attached.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "בקשה לא תקינה." }, { status: 400 });

  // Bots fill every field; people never see this one.
  if (String(form.get("company_website") ?? "").trim()) return NextResponse.json({ ok: true });
  if (rateLimited(request, "cv-builder-send", 5, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי שליחות בזמן קצר. אפשר לנסות שוב עוד כמה דקות." }, { status: 429 });
  }

  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const file = form.get("pdf");
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "כתובת המייל בקורות החיים לא תקינה." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ ok: false, error: "קובץ ה-PDF חסר או גדול מדי." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    return NextResponse.json({ ok: false, error: "הקובץ אינו PDF." }, { status: 400 });
  }
  if (!mailProvider().ok) {
    return NextResponse.json({ ok: false, error: "שליחת מיילים עדיין לא מופעלת באתר. אפשר להוריד את הקובץ." }, { status: 503 });
  }

  const greeting = name ? `היי ${name},` : "היי,";
  const body = `${greeting}\n\nקורות החיים שבנית באתר מצורפים למייל הזה, כקובץ PDF מוכן לשליחה.\n\nבהצלחה,\nחנה ברגמן`;
  const result = await sendEmail({
    to: email,
    subject: "קורות החיים שלך מוכנים",
    html: brandedEmailHtml(
      body,
      `קיבלת את המייל הזה כי ביקשת לשלוח לעצמך את קורות החיים מ<a href="${escapeHtml(siteUrl())}/cv-builder" style="color:#6c83d0">בונה קורות החיים</a> של חנה ברגמן.`,
    ),
    text: `${body}\n\n${siteUrl()}/cv-builder`,
    attachments: [{ filename: "קורות חיים.pdf", content: bytes.toString("base64") }],
  });
  if (!result.ok) {
    console.error("cv-builder send failed:", result.error);
    return NextResponse.json({ ok: false, error: "השליחה נכשלה. אפשר להוריד את הקובץ ולשלוח בעצמך." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
