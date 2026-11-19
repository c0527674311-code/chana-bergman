/**
 * The look of every email Chana sends: her text on white, then the logo and
 * the invitation to the CV builder on a mint card, then a small-print line.
 *
 * Pure strings, no server imports, so the same block can be built in the
 * browser too — Chana pastes it into Gmail as a signature and her own
 * messages come out in exactly the design the system sends.
 */

export const DEFAULT_SITE_URL = "https://chana-bergman.co.il";

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The logo and the CV-builder card.
 *
 * The logo is a hosted PNG with a fixed width: mail clients do not render SVG,
 * and without width/height Outlook draws it at its full 612px. The CV builder
 * is the way back into the pool — a candidate who updates her CV there updates
 * her record — so it is worth a real invitation, not a link in the small print.
 */
export function brandBlockHtml(site = siteUrl()): string {
  const s = escapeHtml(site);
  return `<a href="${s}" style="text-decoration:none">
  <img src="${s}/brand/logo.png" alt="חנה ברגמן" width="170" height="67"
       style="display:block;width:170px;height:auto;border:0;margin:0 0 14px">
</a>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#eafaf4;border-radius:14px;margin:0 0 20px">
  <tr><td style="padding:16px 18px;text-align:right">
    <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:#1c1c3c">בונה קורות החיים של חנה — חינם</p>
    <p style="margin:0 0 10px;font-size:14px;color:#4a4a63">קורות חיים מעוצבים ומוכנים לשליחה תוך כמה דקות, ישירות מהאתר.</p>
    <a href="${s}/cv-builder" style="display:inline-block;background:#6c83d0;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:9px 20px;border-radius:999px">ליצירת קורות חיים ↗</a>
  </td></tr>
</table>`;
}

/**
 * A signature for Chana's own mail: a rule, then the brand block. Pasted into
 * Gmail's signature box (or the end of a message) it looks like the system's
 * emails, minus the unsubscribe line, which only bulk mail needs.
 */
export function signatureHtml(site = siteUrl()): string {
  return `<div dir="rtl" style="direction:rtl;text-align:right;font-family:Assistant,Arial,sans-serif;max-width:600px">
<hr style="margin:20px 0;border:0;border-top:1px solid #e6e6ee">
${brandBlockHtml(site)}
</div>`;
}

/**
 * Wraps a plain-text body in the email shell.
 *
 * The direction is declared on the inner div, not only on <html>: Gmail strips
 * the <html> and <body> tags and renders what is left, so a dir set up there is
 * simply lost and Hebrew arrives left-aligned.
 *
 * `note` is the small print, already HTML (it may carry the unsubscribe link).
 */
export function brandedEmailHtml(body: string, note: string, site = siteUrl()): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f4f5f7">
<div dir="rtl" style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:Assistant,Arial,sans-serif;font-size:16px;line-height:1.7;color:#1c1c3c;background:#fff;direction:rtl;text-align:right">
${paragraphs}
<hr style="margin:28px 0;border:0;border-top:1px solid #e6e6ee">
${brandBlockHtml(site)}
<p style="font-size:12px;color:#8a8a9c;margin:0">
  ${note}
</p>
</div></body></html>`;
}
