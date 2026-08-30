"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type Recipient = { id: string; name: string; email: string };

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
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function send() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          requirementId,
          candidateIds: recipients.map((r) => r.id),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "השליחה נכשלה.");
      setState("sent");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "אירעה שגיאה.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-title"
      className="fixed inset-0 z-[60] grid place-items-center bg-navy/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            aria-label="סגירה"
            className="focus-brand grid h-9 w-9 place-items-center rounded-full hover:bg-canvas"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {state === "sent" ? (
          <div className="py-10 text-center">
            <p className="text-[18px] font-bold text-navy">הדיוור נשלח ל-{recipients.length} נמענות.</p>
            <p className="mt-2 text-[15px] text-ink/70">
              אפשר לעקוב אחרי פתיחות ותגובות במסך הדיוור.
            </p>
            <Button className="mt-6" withArrow={false} onClick={onClose}>
              סגירה
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setSubject(t.subject);
                    setBody(t.body);
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
            <p className="mt-1.5 text-[13px] text-ink/55">
              אפשר להשתמש ב-{"{{שם פרטי}}"} וב-{"{{שם משפחה}}"} — הם יוחלפו אוטומטית לכל נמענת.
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

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="focus-brand rounded-full px-5 py-2.5 text-[15px] font-semibold hover:bg-canvas"
              >
                ביטול
              </button>
              <Button
                withArrow={false}
                onClick={send}
                disabled={state === "sending" || !subject.trim() || !body.trim()}
              >
                {state === "sending" ? "שולחת…" : `שליחה ל-${recipients.length} נמענות`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
