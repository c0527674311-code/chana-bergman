"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CampaignDialog } from "@/components/admin/CampaignDialog";
import { ConsentButton, mailBlockReason } from "@/components/admin/ConsentButton";
import { formatDate } from "@/lib/utils";

export type Row = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  experience: string | null;
  seniority: string | null;
  institution: string | null;
  cohort: number | null;
  stack: string[];
  status: string;
  updatedAt: string;
  mailable: boolean;
  unsubscribed: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  active: "פעילה",
  passive: "לא מחפשת",
  placed: "הושמה",
  archived: "לא רלוונטית",
};

export function CandidateTable({ candidates }: { candidates: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaignOpen, setCampaignOpen] = useState(false);

  const selectedRows = useMemo(
    () => candidates.filter((c) => selected.has(c.id)),
    [candidates, selected],
  );
  const mailable = selectedRows.filter((r) => r.mailable && r.email);
  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!candidates.length) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-14 text-center">
        <p className="text-[17px] font-semibold text-navy">לא נמצאו מועמדות</p>
        <p className="mt-2 text-[15px] text-ink/65">נסי לצמצם את הסינונים.</p>
      </div>
    );
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-3 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-full bg-navy px-5 py-3 text-white shadow-[var(--shadow-card)]">
          <p className="text-[15px]">
            נבחרו {selected.size}
            {mailable.length !== selected.size && (
              <span className="text-white/70"> · {mailable.length} ניתן לדוור</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="focus-brand rounded-full px-4 py-1.5 text-[14px] font-semibold hover:bg-white/10"
            >
              ניקוי
            </button>
            <ConsentButton tone="dark" candidates={selectedRows} onMarked={() => router.refresh()} />
            <Button
              size="sm"
              variant="mint"
              withArrow={false}
              disabled={!mailable.length}
              onClick={() => setCampaignOpen(true)}
            >
              שליחת מייל קבוצתי
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <table className="w-full min-w-[900px] text-start text-[14px]">
          <caption className="sr-only">רשימת המועמדות במאגר</caption>
          <thead className="border-b border-ink/10 text-[13px] text-ink/55">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)))
                  }
                  aria-label="בחירת כל המועמדות"
                  className="focus-brand h-4 w-4 accent-[var(--color-primary)]"
                />
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">שם</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">סטאק</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">ניסיון</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">אזור</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">מוסד / שנתון</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">סטטוס</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">עודכן</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {candidates.map((c) => (
              <tr key={c.id} className={selected.has(c.id) ? "bg-primary-50" : "hover:bg-canvas"}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    aria-label={`בחירת ${c.name}`}
                    className="focus-brand h-4 w-4 accent-[var(--color-primary)]"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="block font-semibold text-navy">{c.name}</span>
                  {/* A personal email from her own mailbox is correspondence, not
                      a campaign — so it is always one click away, consent or not. */}
                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      dir="ltr"
                      title="מייל אישי מהתיבה שלך"
                      className="focus-brand block text-[12.5px] text-primary hover:underline"
                    >
                      {c.email}
                    </a>
                  ) : (
                    <span className="block text-[12.5px] text-ink/55" dir="ltr">
                      {c.phone ?? "—"}
                    </span>
                  )}
                  {mailBlockReason(c) && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {mailBlockReason(c)}
                    </span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <span className="flex flex-wrap gap-1">
                    {c.stack.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full bg-mint-100 px-2 py-0.5 text-[12px] text-navy">
                        {s}
                      </span>
                    ))}
                    {c.stack.length > 4 && (
                      <span className="text-[12px] text-ink/50">+{c.stack.length - 4}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/75">
                  {c.experience ?? "—"}
                  {c.seniority && <span className="block text-[12.5px] text-ink/50">{c.seniority}</span>}
                </td>
                <td className="px-4 py-3 text-ink/75">
                  {c.region ?? "—"}
                  {c.city && <span className="block text-[12.5px] text-ink/50">{c.city}</span>}
                </td>
                <td className="px-4 py-3 text-ink/75">
                  {c.institution ?? "—"}
                  {c.cohort && <span className="block text-[12.5px] text-ink/50">{c.cohort}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-[12.5px] font-semibold text-ink/75">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-ink/55">{formatDate(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {campaignOpen && (
        <CampaignDialog
          recipients={mailable.map((r) => ({ id: r.id, name: r.name, email: r.email! }))}
          onClose={() => setCampaignOpen(false)}
        />
      )}
    </>
  );
}
