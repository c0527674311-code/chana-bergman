import { createHash, randomUUID } from "node:crypto";
import { CONTACT_DETAILS } from "@/lib/content/site";

/**
 * Email abstraction. Swapping providers is a change to this file plus env
 * vars, not to the campaign UI.
 *
 * Only Resend actually sends. A Smoove path used to live here: it created a
 * list and pushed contacts but never dispatched a campaign, and still reported
 * every recipient as sent. An unimplemented provider is now an honest error.
 */

export type MailRecipient = {
  /** Candidate id — results are reported per recipient, not per address. */
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  /** The confirm page linked in the footer, for people. */
  unsubscribeUrl: string;
  /** The RFC 8058 endpoint in the List-Unsubscribe header, for mail clients. */
  oneClickUnsubscribeUrl: string;
};

export type SendOutcome = {
  sent: Array<{ id: string; providerId?: string }>;
  failed: Array<{ id: string; email: string; error: string }>;
};

export const INVALID_EMAIL_ERROR = "כתובת מייל לא תקינה";

type Provider =
  | { ok: true; name: "resend"; apiKey: string }
  | { ok: false; name: string; error: string };

export function mailProvider(): Provider {
  const name = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (name === "resend") {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    return apiKey
      ? { ok: true, name, apiKey }
      : { ok: false, name, error: "אין ספק דיוור מוגדר — חסר RESEND_API_KEY." };
  }
  if (name === "smoove") {
    return { ok: false, name, error: "אין ספק דיוור מוגדר — שליחה דרך Smoove לא ממומשת במערכת." };
  }
  return { ok: false, name: name || "none", error: "אין ספק דיוור מוגדר." };
}

function mailFrom(): string {
  return process.env.MAIL_FROM ?? "חנה ברגמן <info@chana-bergman.co.il>";
}

/**
 * Where candidates' replies go. The sending address may have no inbox, and the
 * templates say "just reply to this email".
 */
export function campaignReplyTo(): string | undefined {
  return process.env.MAIL_REPLY_TO?.trim() || CONTACT_DETAILS.email || undefined;
}

// Deliberately stricter than RFC 5322: one @, no spaces or quotes, a dotted
// domain. Imported spreadsheets carry "name@gmail", "a@b.com, c@d.com" and
// trailing text — any of which makes Resend reject the whole batch.
const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,}|xn--[A-Za-z0-9-]+)$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

const NAME_FIELDS = [
  { pattern: String.raw`\{\{\s*(?:שם פרטי|first_name)\s*\}\}`, pick: (r: Names) => r.firstName },
  { pattern: String.raw`\{\{\s*(?:שם משפחה|last_name)\s*\}\}`, pick: (r: Names) => r.lastName },
];

type Names = { firstName?: string | null; lastName?: string | null };

/**
 * Replaces {{שם פרטי}} / {{שם משפחה}} (and {{first_name}} / {{last_name}}) per
 * recipient. Many imported candidates have no name; a blank placeholder takes
 * its surrounding space with it, so "היי {{שם פרטי}}," reads "היי," rather
 * than "היי ,".
 */
export function renderTemplate(template: string, r: Names): string {
  let out = template;
  for (const { pattern, pick } of NAME_FIELDS) {
    const value = (pick(r) ?? "").replace(/\s+/g, " ").trim();
    if (value) {
      // A function replacement, so a "$" in a name is not read as a pattern.
      out = out.replace(new RegExp(pattern, "g"), () => value);
      continue;
    }
    out = out
      // Opening a line ("{{שם פרטי}}, שלום"): drop the comma after it too.
      .replace(new RegExp(String.raw`^[ \t]*${pattern}[ \t]*,?[ \t]*`, "gm"), "")
      // Anywhere else: drop the space before it, and a one-letter Hebrew
      // prefix glued to it ("משרה ל{{שם פרטי}}" → "משרה").
      .replace(new RegExp(String.raw`[ \t]*(?:(?<=^|[ \t])[ובהלמשכ])?${pattern}`, "gm"), "");
  }
  return out;
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
  <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6c83d0">להסרה מרשימת התפוצה</a>
</p>
</div></body></html>`;
}

function toText(body: string, unsubscribeUrl: string): string {
  return `${body}\n\n—\nקיבלת את המייל הזה כי נמצאת במאגר המועמדות של חנה ברגמן.\nלהסרה מרשימת התפוצה: ${unsubscribeUrl}`;
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
  opts: {
    /** Stable per campaign: retries of the same chunk are deduplicated by Resend for 24h. */
    idempotencyScope?: string;
    /** Called as each chunk settles, so statuses survive a timeout mid-campaign. */
    onProgress?: (delta: SendOutcome) => void | Promise<void>;
  } = {},
): Promise<SendOutcome> {
  const outcome: SendOutcome = { sent: [], failed: [] };
  const report = async (delta: SendOutcome) => {
    outcome.sent.push(...delta.sent);
    outcome.failed.push(...delta.failed);
    try {
      await opts.onProgress?.(delta);
    } catch (err) {
      console.error("[mailer] onProgress failed:", err);
    }
  };
  const failAll = (list: MailRecipient[], error: string): SendOutcome => ({
    sent: [],
    failed: list.map((r) => ({ id: r.id, email: r.email, error })),
  });

  const valid = recipients.filter((r) => isValidEmail(r.email));
  const invalid = recipients.filter((r) => !isValidEmail(r.email));
  if (invalid.length) await report(failAll(invalid, INVALID_EMAIL_ERROR));

  const provider = mailProvider();
  if (!provider.ok) {
    console.warn(`[mailer] ${provider.error} — ${valid.length} מיילים לא נשלחו.`);
    if (valid.length) await report(failAll(valid, provider.error));
    return outcome;
  }

  const from = mailFrom();
  const replyTo = campaignReplyTo();
  let fatal: string | null = null;

  const message = (r: MailRecipient) => {
    const body = renderTemplate(bodyTemplate, r);
    return {
      from,
      to: [r.email],
      subject: renderTemplate(subject, r),
      html: toHtml(body, r.unsubscribeUrl),
      text: toText(body, r.unsubscribeUrl),
      ...(replyTo ? { reply_to: replyTo } : {}),
      headers: {
        "List-Unsubscribe": `<${r.oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  };

  // Resend rejects a whole batch when any one message is invalid. Halving the
  // rejected chunk isolates the bad messages in ~2·log2(n) requests and still
  // delivers the rest.
  const deliver = async (chunk: MailRecipient[]): Promise<void> => {
    if (fatal) return report(failAll(chunk, fatal));

    const key = opts.idempotencyScope
      ? `${opts.idempotencyScope}:${createHash("sha256").update(chunk.map((r) => r.id).join(",")).digest("hex").slice(0, 40)}`
      : undefined;
    const res = await postResend(RESEND_BATCH_URL, provider.apiKey, chunk.map(message), key);

    if (res.kind === "ok") {
      const body = res.data as { data?: Array<{ id?: string }>; errors?: Array<{ index?: number; message?: string }> } | null;
      const rejected = new Map((body?.errors ?? []).map((e) => [e.index, e.message ?? "נדחה על ידי Resend"]));
      const delta: SendOutcome = { sent: [], failed: [] };
      chunk.forEach((r, i) => {
        const error = rejected.get(i);
        if (error) delta.failed.push({ id: r.id, email: r.email, error: `Resend: ${error}` });
        else delta.sent.push({ id: r.id, providerId: body?.data?.[i]?.id });
      });
      return report(delta);
    }
    if (res.kind === "invalid" && chunk.length > 1) {
      const mid = Math.ceil(chunk.length / 2);
      await deliver(chunk.slice(0, mid));
      return deliver(chunk.slice(mid));
    }
    if (res.kind === "fatal") fatal = res.error;
    return report(failAll(chunk, res.error));
  };

  for (let i = 0; i < valid.length; i += RESEND_BATCH_MAX) {
    await deliver(valid.slice(i, i + RESEND_BATCH_MAX));
  }
  return outcome;
}

/**
 * A single message (owner notifications and the like) through the configured
 * provider. Never throws; no List-Unsubscribe header.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  try {
    const provider = mailProvider();
    if (!provider.ok) return { ok: false, error: provider.error };

    const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((e) => e.trim()).filter(Boolean);
    if (!to.length) return { ok: false, error: "לא צוין נמען." };
    const bad = to.filter((e) => !isValidEmail(e));
    if (bad.length) return { ok: false, error: `${INVALID_EMAIL_ERROR}: ${bad.join(", ")}` };

    const res = await postResend(
      RESEND_SEND_URL,
      provider.apiKey,
      {
        from: mailFrom(),
        to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      },
      // One key for this call, so the network retry can't deliver it twice.
      randomUUID(),
    );
    if (res.kind !== "ok") return { ok: false, error: res.error };
    const id = (res.data as { id?: unknown } | null)?.id;
    return { ok: true, id: typeof id === "string" ? id : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שליחת המייל נכשלה." };
  }
}

const RESEND_SEND_URL = "https://api.resend.com/emails";
const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const RESEND_BATCH_MAX = 100;

type PostResult =
  | { kind: "ok"; data: unknown }
  /** 400/413/422 — something in this payload was rejected; smaller chunks may pass. */
  | { kind: "invalid"; error: string }
  /** Key, domain or quota — nothing after this will go through either. */
  | { kind: "fatal"; error: string }
  /** Provider or network trouble that outlasted the retries. */
  | { kind: "failed"; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postResend(
  url: string,
  apiKey: string,
  payload: unknown,
  idempotencyKey: string | undefined,
): Promise<PostResult> {
  let serverRetries = 0;
  let waitRetries = 0;

  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      if (serverRetries++ < 1) {
        await sleep(1000);
        continue;
      }
      return { kind: "failed", error: `אין חיבור ל-Resend: ${err instanceof Error ? err.message : "unknown"}` };
    }

    if (res.ok) return { kind: "ok", data: await res.json().catch(() => null) };

    const raw = await res.text().catch(() => "");
    let name = "";
    let detail = raw.slice(0, 200) || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(raw) as { name?: string; message?: string };
      name = parsed.name ?? "";
      detail = parsed.message || parsed.name || detail;
    } catch {
      // Not JSON — keep the raw text.
    }
    const error = `Resend (${res.status}): ${detail}`;

    const quota = name === "daily_quota_exceeded" || name === "monthly_quota_exceeded";
    const busy = (res.status === 429 && !quota) || (res.status === 409 && name === "concurrent_idempotent_requests");
    if (busy) {
      if (waitRetries++ < 5) {
        const after = Number(res.headers.get("retry-after"));
        await sleep(after > 0 ? Math.min(after, 30) * 1000 : 1000 * 2 ** (waitRetries - 1));
        continue;
      }
      return { kind: "failed", error };
    }
    if (res.status >= 500) {
      if (serverRetries++ < 1) {
        await sleep(1000);
        continue;
      }
      return { kind: "failed", error };
    }
    if (res.status === 401 || res.status === 403 || quota) return { kind: "fatal", error };
    if ((res.status === 400 && name !== "invalid_idempotency_key") || res.status === 413 || res.status === 422) {
      return { kind: "invalid", error };
    }
    return { kind: "failed", error };
  }
}
