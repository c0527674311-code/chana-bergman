"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";

export type Lead = {
  id: string;
  kind: "employer" | "inquiry";
  company: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  attachmentUrl: string | null;
  handled: boolean;
  createdAt: string;
};

type Filter = "open" | "handled" | "all";

export function LeadsInbox({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = leads.filter((l) => !l.handled).length;
  const shown = leads.filter((l) =>
    filter === "all" ? true : filter === "open" ? !l.handled : l.handled,
  );

  async function setHandled(lead: Lead, handled: boolean) {
    setBusy(lead.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, handled }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "העדכון נכשל.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "העדכון נכשל.");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "open", label: `ממתינות לטיפול (${open})` },
    { key: "handled", label: `טופלו (${leads.length - open})` },
    { key: "all", label: `הכל (${leads.length})` },
  ];

  return (
    <div>
      <div role="tablist" aria-label="סינון פניות" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filter === t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "focus-brand rounded-full px-4 py-2 text-[14px] font-semibold",
              filter === t.key ? "bg-primary text-white" : "bg-white text-ink ring-1 ring-ink/10 hover:bg-primary-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white p-8 text-center text-[15px] text-ink/60">
          {filter === "open" ? "אין פניות שממתינות לטיפול." : "אין פניות להצגה."}
        </p>
      ) : (
        <ul className="grid gap-4">
          {shown.map((lead) => (
            <li
              key={lead.id}
              className={cn(
                "rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]",
                lead.handled && "opacity-70",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-primary">
                    {lead.kind === "employer" ? "מעסיק" : "שאלה מהאתר"} · {formatDate(lead.createdAt)}
                  </p>
                  <h2 className="mt-1 text-[18px] font-bold text-navy">
                    {lead.company ?? lead.contactName ?? lead.email}
                  </h2>
                  {lead.company && lead.contactName && (
                    <p className="text-[15px] text-ink/75">{lead.contactName}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy === lead.id}
                  onClick={() => setHandled(lead, !lead.handled)}
                  className={cn(
                    "focus-brand shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold disabled:opacity-50",
                    lead.handled
                      ? "text-ink/70 ring-1 ring-ink/15 hover:bg-canvas"
                      : "bg-mint text-navy hover:bg-mint-100",
                  )}
                >
                  {busy === lead.id ? "שומרת…" : lead.handled ? "החזרה לממתינות" : "סימון כטופלה"}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
                <a href={`mailto:${lead.email}`} dir="ltr" className="focus-brand rounded text-primary hover:underline">
                  {lead.email}
                </a>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} dir="ltr" className="focus-brand rounded text-primary hover:underline">
                    {lead.phone}
                  </a>
                )}
              </div>

              {lead.message && (
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-canvas px-4 py-3 text-[15px] leading-relaxed text-ink/80">
                  {lead.message}
                </p>
              )}

              {lead.attachmentUrl && (
                <a
                  href={lead.attachmentUrl}
                  className="focus-brand mt-3 inline-flex rounded-full px-4 py-2 text-[14px] font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary-50"
                >
                  הורדת מסמך הדרישות
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
