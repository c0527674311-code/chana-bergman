"use client";

import { useState } from "react";

export type ConsentCandidate = {
  id: string;
  email: string | null;
  mailable: boolean;
  unsubscribed: boolean;
};

/**
 * Why a candidate cannot receive a group mailing, in words Chana can act on.
 * A bare "ללא הסכמת דיוור" read as a system fault: she found herself in the
 * database, saw her own address, and the send button simply did nothing.
 */
export function mailBlockReason(c: ConsentCandidate): string | null {
  if (c.mailable) return null;
  if (!c.email) return "אין מייל במאגר";
  if (c.unsubscribed) return "הסירה עצמה מהדיוור";
  return "טרם אושר דיוור";
}

/**
 * Lets Chana record consent for candidates she knows asked to hear about jobs.
 *
 * Every CV imported from her disk arrives without consent, because the file
 * cannot tell us whether its owner agreed to mailings — so all 60 imported
 * candidates were unmailable, and there was no way anywhere to change that.
 * The decision stays with her; the system only refuses to override someone who
 * unsubscribed, and never marks a row that has no address to mail.
 */
export function ConsentButton({
  candidates,
  onMarked,
  tone = "light",
}: {
  candidates: ConsentCandidate[];
  onMarked: (ids: string[]) => void;
  tone?: "light" | "dark";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = candidates.filter((c) => !c.mailable && c.email && !c.unsubscribed);
  if (!eligible.length) return null;

  async function mark() {
    const ok = window.confirm(
      `לסמן ${eligible.length} ${eligible.length === 1 ? "מועמדת" : "מועמדות"} כמאשרות קבלת הצעות עבודה במייל?\n\n` +
        "סמני רק מי שפנתה אלייך או ביקשה שתעדכני אותה על משרות. " +
        "מי שהסירה את עצמה מרשימת התפוצה לא תסומן.",
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/candidates/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: eligible.map((c) => c.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "הסימון נכשל.");
      onMarked(json.updated ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "הסימון נכשל.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={mark}
        disabled={busy}
        className={
          tone === "dark"
            ? "focus-brand rounded-full border border-white/40 px-4 py-1.5 text-[14px] font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            : "focus-brand rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[14px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        }
      >
        {busy ? "מסמנת…" : `${eligible.length} טרם אישרו דיוור — סימון כמאשרות`}
      </button>
      {error && (
        <span role="alert" className={tone === "dark" ? "text-[13px] text-amber-200" : "text-[13px] text-red-700"}>
          {error}
        </span>
      )}
    </span>
  );
}
