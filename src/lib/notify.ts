import { CONTACT_DETAILS } from "@/lib/content/site";
import { sendEmail } from "@/lib/mailer";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/**
 * Tells Chana that someone is waiting for a reply.
 *
 * Employer leads and site inquiries were saved to a table no screen showed and
 * no email announced, so nobody knew they existed. Never throws: a failed
 * notification must not fail the visitor's form — the lead is already saved
 * and listed under /admin/leads.
 */
export async function notifyOwner(
  subject: string,
  rows: [label: string, value: string | null | undefined][],
  opts: { replyTo?: string } = {},
) {
  const to = process.env.NOTIFY_EMAIL || CONTACT_DETAILS.email;
  if (!to) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chana-bergman.co.il";
  const filled = rows.filter(([, v]) => v && String(v).trim());
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c1c3c">
<p style="font-size:17px;font-weight:bold">${escapeHtml(subject)}</p>
<table style="border-collapse:collapse">${filled
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0 4px 16px;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(String(value))}</td></tr>`,
    )
    .join("")}</table>
<p><a href="${site}/admin/leads">לכל הפניות במערכת הניהול</a></p>
</div>`;
  const text = [subject, "", ...filled.map(([l, v]) => `${l}: ${v}`), "", `${site}/admin/leads`].join("\n");

  try {
    const result = await sendEmail({ to, subject: subject.slice(0, 150), html, text, replyTo: opts.replyTo });
    if (!result.ok) console.error("owner notification failed:", result.error);
  } catch (err) {
    console.error("owner notification failed:", err);
  }
}
