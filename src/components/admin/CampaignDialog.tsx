"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type Recipient = { id: string; name: string; email: string };

type Reason = { reason: string; count: number };

/** What the server actually did — not what was selected. */
type CampaignResult = {
  sent: number;
  failed: number;
  reasons: Reason[];
  skipped: Reason[];
  replyTo?: string;
  duplicate?: boolean;
  inProgress?: boolean;
  warning?: string;
};

const TEMPLATES = [
  {
    name: "הצעת משרה — חזרי אליי אם רלוונטי",
    subject: "משרה חדשה שיכולה להתאים לך",
    body: `היי {{שם פרטי}},

הגיעה אליי משרה שנראית לי מתאימה לך:

[כאן מדביקים את פרטי המשרה — תפקיד, טכנולוגיות, מיקום, היקף]

אם זה רלוונטי עבורך — פשוט השיבי למייל הזה, ואחזור אלייך טלפונית.

תודה,
חנה ברגמן`,
  },
  {
    name: "בקשת קורות חיים מעודכנים",
    subject: "מחפשת אותך למשרה חדשה — אפשר קו״ח מעודכנים?",
    body: `היי {{שם פרטי}},

הגיעה אליי משרה שנראית לי מתאימה לך מאוד.
אשמח לקבל ממך קורות חיים מעודכנים כדי שאוכל להגיש אותך.

תודה,
חנה ברגמן`,
  },
  {
    name: "גיוס ראשות צוות",
    subject: "מחפשת ראשות צוות לפרקטיקום הקרוב",
    body: `היי {{שם פרטי}},

אני פותחת פרקטיקום חדש ומחפשת ראשות צוות מנוסות.
אם זה מעניין אותך — השיבי למייל הזה ונדבר.

חנה ברגמן`,
  },
  {
    name: "הודעה חופשית",
    subject: "",
    body: `היי {{שם פרטי}},

`,
  },
];

/** A template Chana saved — every campaign she sends is kept as one. */
type SavedTemplate = { id: string; name: string; subject: string; body: string };

/**
 * Identifies this send to the server. Generated once per opened dialog, so a
 * double click or a retry after a lost response finds the campaign that was
 * already created instead of mailing everyone twice.
 */
function newClientKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID exists only in secure contexts; same v4 shape otherwise.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function CampaignDialog({
  recipients,
  onClose,
  requirementId,
}: {
  recipients: Recipient[];
  onClose: () => void;
  requirementId?: string;
}) {
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientKey] = useState(newClientKey);
  const [saved, setSaved] = useState<SavedTemplate[]>([]);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const sending = state === "sending";

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Mails she already sent, ready to reuse.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/email-templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && Array.isArray(json?.templates)) setSaved(json.templates);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Keeps this mail for next time. Sending saves it automatically. */
  async function saveTemplate(name: string, opts: { silent?: boolean } = {}) {
    const clean = name.trim().slice(0, 120);
    if (!clean || !subject.trim() || !body.trim()) return;
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean, subject, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "השמירה נכשלה.");
      setSaved((prev) => [json.template, ...prev.filter((t) => t.id !== json.template.id)]);
      setSavedNote(opts.silent ? `המייל נשמר כתבנית בשם ״${clean}״.` : `נשמר כתבנית ״${clean}״.`);
    } catch (err) {
      if (!opts.silent) setSavedNote(err instanceof Error ? err.message : "השמירה נכשלה.");
    }
  }

  async function removeTemplate(t: SavedTemplate) {
    if (!window.confirm(`למחוק את התבנית ״${t.name}״?`)) return;
    const res = await fetch(`/api/admin/email-templates?id=${t.id}`, { method: "DELETE" });
    if (res.ok) setSaved((prev) => prev.filter((x) => x.id !== t.id));
  }

  // While sending, nothing closes the dialog: closing used to leave the send
  // button one click away from mailing the same people again.
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose, sending]);

  useEffect(() => {
    if (!sending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sending]);

  async function send() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState("sending");
    setError(null);
    try {
      let res: Response;
      try {
        res = await fetch("/api/admin/campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            body,
            requirementId,
            clientKey,
            candidateIds: recipients.map((r) => r.id),
          }),
        });
      } catch {
        throw new Error(LOST_RESPONSE);
      }
      const json = await res.json().catch(() => null);
      if (!json) throw new Error(LOST_RESPONSE);
      if (!res.ok) throw new Error(json.error ?? "השליחה נכשלה.");
      setResult({
        sent: Number(json.sent ?? 0),
        failed: Number(json.failed ?? 0),
        reasons: Array.isArray(json.reasons) ? json.reasons : [],
        skipped: Array.isArray(json.skipped) ? json.skipped : [],
        replyTo: json.replyTo,
        duplicate: Boolean(json.duplicate),
        inProgress: Boolean(json.inProgress),
        warning: json.warning,
      });
      setState("sent");
      // What she actually sent is the best template for next time.
      if (Number(json.sent ?? 0) > 0 && !json.duplicate) {
        void saveTemplate(subject, { silent: true });
      }
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "אירעה שגיאה.");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-title"
      aria-busy={sending}
      className="fixed inset-0 z-[60] grid place-items-center bg-navy/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !sending && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-white p-7 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="campaign-title" className="text-[22px] font-extrabold text-navy">
              שליחת מייל קבוצתי
            </h2>
            <p className="mt-1 text-[14px] text-ink/70">{recipients.length} נמענות נבחרו</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="סגירה"
            className="focus-brand grid h-9 w-9 place-items-center rounded-full hover:bg-canvas disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {state === "sent" && result ? (
          <div className="py-10 text-center">
            {/* Every line here comes from the server's count and reasons. The
                old screen blamed a missing provider whenever nothing was sent
                and promised open/reply tracking that doesn't exist. */}
            <p className="text-[18px] font-bold text-navy">
              {result.duplicate
                ? result.inProgress
                  ? "הדיוור הזה כבר בשליחה — הוא לא נשלח פעם נוספת."
                  : "הדיוור הזה כבר נשלח קודם — הוא לא נשלח פעם נוספת."
                : result.sent === 0
                  ? "שום מייל לא נשלח."
                  : `הדיוור נשלח ל-${result.sent} נמענות.`}
            </p>
            {result.duplicate && (
              <p className="mt-2 text-[15px] text-ink/70">
                עד עכשיו: {result.sent} נשלחו, {result.failed} נכשלו.
              </p>
            )}

            {result.failed > 0 && (
              <ReasonList
                title={
                  result.sent === 0 && !result.duplicate
                    ? "הסיבה:"
                    : `${result.failed} לא נשלחו:`
                }
                reasons={result.reasons}
                tone="text-amber-800"
              />
            )}
            {result.skipped.length > 0 && (
              <ReasonList title="לא נכללו בדיוור:" reasons={result.skipped} tone="text-ink/70" />
            )}

            {result.warning && (
              <p role="alert" className="mx-auto mt-4 max-w-md rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
                {result.warning}
              </p>
            )}

            {result.replyTo && result.sent > 0 && (
              <p className="mt-4 text-[15px] text-ink/70">
                תשובות של נמענות יגיעו לתיבה <span dir="ltr">{result.replyTo}</span>.
              </p>
            )}
            <Button className="mt-6" withArrow={false} onClick={onClose}>
              סגירה
            </Button>
          </div>
        ) : (
          <>
            <fieldset disabled={sending} className="contents">
              {saved.length > 0 && (
                <div className="mt-5">
                  <p className="text-[13px] font-bold text-navy">המיילים שלי</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {saved.map((t) => (
                      <span
                        key={t.id}
                        className="flex items-center gap-1 rounded-full bg-primary-50 ps-1 pe-3.5 text-[13px] font-semibold text-primary-700 ring-1 ring-primary/20"
                      >
                        <button
                          type="button"
                          onClick={() => removeTemplate(t)}
                          aria-label={`מחיקת התבנית ${t.name}`}
                          className="focus-brand grid h-6 w-6 place-items-center rounded-full text-primary/60 hover:bg-white hover:text-primary"
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSubject(t.subject);
                            setBody(t.body);
                            setSavedNote(null);
                          }}
                          className="focus-brand rounded-full py-1.5"
                        >
                          {t.name}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-5 text-[13px] font-bold text-navy">נוסחים מוכנים</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => {
                      setSubject(t.subject);
                      setBody(t.body);
                      setSavedNote(null);
                    }}
                    className="focus-brand rounded-full border border-ink/15 px-3.5 py-1.5 text-[13px] font-semibold hover:bg-canvas"
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <label htmlFor="subject" className="mt-5 block text-[14px] font-bold text-navy">
                נושא
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="focus-brand mt-1.5 h-12 w-full rounded-full border border-ink/20 px-5 text-[15px]"
              />

              <label htmlFor="body" className="mt-4 block text-[14px] font-bold text-navy">
                תוכן ההודעה
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="focus-brand mt-1.5 w-full resize-y rounded-[22px] border border-ink/20 px-5 py-4 text-[15px] leading-relaxed"
              />
            </fieldset>
            <p className="mt-1.5 text-[13px] text-ink/55">
              אפשר להשתמש ב-{"{{שם פרטי}}"} וב-{"{{שם משפחה}}"} — הם יוחלפו אוטומטית לכל נמענת. אם
              חסר שם, הוא יושמט והפתיחה תישאר תקינה (&quot;היי,&quot;).
            </p>

            <details className="mt-4">
              <summary className="focus-brand cursor-pointer rounded text-[14px] font-semibold text-primary">
                הצגת רשימת הנמענות
              </summary>
              <ul className="mt-2 max-h-40 overflow-y-auto text-[13px] text-ink/70">
                {recipients.map((r) => (
                  <li key={r.id} className="py-0.5">
                    {r.name} — <span dir="ltr">{r.email}</span>
                  </li>
                ))}
              </ul>
            </details>

            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
                {error}
              </p>
            )}

            <p className="mt-4 rounded-2xl bg-canvas px-5 py-3 text-[13px] leading-relaxed text-ink/70">
              לכל מייל יתווסף אוטומטית קישור הסרה מדיוור, כנדרש בתיקון 40 לחוק התקשורת. נמענות
              שהסירו את עצמן לא ייכללו.
            </p>

            {sending && (
              <p role="status" className="mt-4 text-[14px] font-semibold text-navy">
                שולחת את הדיוור ל-{recipients.length} נמענות… זה יכול לקחת כמה דקות. אין לסגור את
                החלון עד שתופיע התוצאה.
              </p>
            )}

            {savedNote && (
              <p role="status" className="mt-4 text-[14px] font-semibold text-primary">
                {savedNote}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={sending || !subject.trim() || !body.trim()}
                onClick={() => {
                  const name = window.prompt("שם לתבנית:", subject.trim().slice(0, 120));
                  if (name) void saveTemplate(name);
                }}
                className="focus-brand me-auto rounded-full border border-ink/15 px-4 py-2.5 text-[14px] font-semibold hover:bg-canvas disabled:opacity-40"
              >
                שמירה כתבנית
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="focus-brand rounded-full px-5 py-2.5 text-[15px] font-semibold hover:bg-canvas disabled:opacity-40"
              >
                ביטול
              </button>
              <Button
                withArrow={false}
                onClick={send}
                disabled={sending || !subject.trim() || !body.trim()}
              >
                {sending ? "שולחת…" : `שליחה ל-${recipients.length} נמענות`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const LOST_RESPONSE =
  "לא התקבלה תשובה מהשרת, וייתכן שהדיוור בכל זאת נשלח. לחיצה חוזרת על שליחה לא תשלח אותו פעמיים — היא תציג מה קרה.";

function ReasonList({ title, reasons, tone }: { title: string; reasons: Reason[]; tone: string }) {
  return (
    <div className={`mx-auto mt-3 max-w-md text-[15px] ${tone}`}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {reasons.map((r) => (
          <li key={r.reason}>
            {r.reason} — {r.count}
          </li>
        ))}
      </ul>
    </div>
  );
}
