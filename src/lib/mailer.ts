/**
 * Bulk-email abstraction.
 *
 * Per the spec the plan is to keep Smoove as the sending engine at first — it
 * already holds the domain reputation and the historical lists — while Chana
 * never has to open it. Swapping to Resend (or anything else) is a change to
 * this file plus one env var, not to the campaign UI.
 */

export type MailRecipient = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  unsubscribeUrl: string;
};

export type SendResult = { sent: number; failed: Array<{ email: string; error: string }> };

/** Replaces {{שם פרטי}} / {{שם משפחה}} per recipient. */
export function renderTemplate(template: string, r: MailRecipient): string {
  return template
    .replaceAll("{{שם פרטי}}", r.firstName ?? "")
    .replaceAll("{{שם משפחה}}", r.lastName ?? "")
    .replaceAll("{{first_name}}", r.firstName ?? "")
    .replaceAll("{{last_name}}", r.lastName ?? "");
}

/**
 * Wraps the campaign body in the email shell.
 *
 * The direction is declared on the inner div, not only on <html>: Gmail strips
 * the <html> and <body> tags and renders what is left, so a dir set up there is
 * simply lost and Hebrew arrives left-aligned.
 */
function toHtml(body: string, unsubscribeUrl: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f4f5f7">
<div dir="rtl" style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:Assistant,Arial,sans-serif;font-size:16px;line-height:1.7;color:#1c1c3c;background:#fff;direction:rtl;text-align:right">
${paragraphs}
<hr style="margin:28px 0;border:0;border-top:1px solid #e6e6ee">
<p style="font-size:12px;color:#8a8a9c;margin:0">
  קיבלת את המייל הזה כי נמצאת במאגר המועמדות של חנה ברגמן.
  <a href="${unsubscribeUrl}" style="color:#6c83d0">להסרה מרשימת התפוצה</a>
</p>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBulk(
  subject: string,
  bodyTemplate: string,
  recipients: MailRecipient[],
): Promise<SendResult> {
  const provider = process.env.EMAIL_PROVIDER ?? "none";
  const from = process.env.MAIL_FROM ?? "חנה ברגמן <info@chana-bergman.co.il>";

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    return sendViaResend(subject, bodyTemplate, recipients, from);
  }
  if (provider === "smoove" && process.env.SMOOVE_API_KEY) {
    return sendViaSmoove(subject, bodyTemplate, recipients);
  }

  // No provider configured: record the intent rather than pretending to send.
  console.warn(
    `[mailer] EMAIL_PROVIDER='${provider}' לא מוגדר — ${recipients.length} מיילים לא נשלחו בפועל.`,
  );
  return {
    sent: 0,
    failed: recipients.map((r) => ({ email: r.email, error: "ספק דיוור לא מוגדר" })),
  };
}

async function sendViaResend(
  subject: string,
  bodyTemplate: string,
  recipients: MailRecipient[],
  from: string,
): Promise<SendResult> {
  const failed: SendResult["failed"] = [];
  let sent = 0;

  // Resend caps batches at 100.
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const payload = chunk.map((r) => ({
      from,
      to: [r.email],
      subject: renderTemplate(subject, r),
      html: toHtml(renderTemplate(bodyTemplate, r), r.unsubscribeUrl),
      headers: { "List-Unsubscribe": `<${r.unsubscribeUrl}>` },
    }));

    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text();
        chunk.forEach((r) => failed.push({ email: r.email, error: detail.slice(0, 200) }));
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      chunk.forEach((r) => failed.push({ email: r.email, error: message }));
    }
  }
  return { sent, failed };
}

/**
 * Smoove sends by adding contacts to a list and triggering a campaign, rather
 * than posting message bodies one by one. This creates the list and pushes the
 * contacts; the campaign itself is then dispatched from the Smoove template.
 */
async function sendViaSmoove(
  subject: string,
  bodyTemplate: string,
  recipients: MailRecipient[],
): Promise<SendResult> {
  const key = process.env.SMOOVE_API_KEY!;
  const base = "https://rest.smoove.io/v1";
  const failed: SendResult["failed"] = [];

  try {
    const listRes = await fetch(`${base}/Lists`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${subject} — ${new Date().toISOString().slice(0, 16)}` }),
    });
    if (!listRes.ok) throw new Error(`יצירת רשימה נכשלה: ${await listRes.text()}`);
    const list = await listRes.json();

    const contactsRes = await fetch(`${base}/Contacts/Bulk?updateIfExists=true`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        recipients.map((r) => ({
          email: r.email,
          firstName: r.firstName ?? "",
          lastName: r.lastName ?? "",
          lists_ToSubscribe: [list.id],
        })),
      ),
    });
    if (!contactsRes.ok) throw new Error(`הוספת נמענים נכשלה: ${await contactsRes.text()}`);

    return { sent: recipients.length, failed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { sent: 0, failed: recipients.map((r) => ({ email: r.email, error: message })) };
  }
}
