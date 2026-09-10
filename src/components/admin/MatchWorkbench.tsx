"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CampaignDialog } from "@/components/admin/CampaignDialog";
import { ConsentButton, mailBlockReason } from "@/components/admin/ConsentButton";
import type { ExtractedRequirement } from "@/lib/matching";
import type { MatchResponse, MatchRow } from "@/lib/match-response";
import { cn } from "@/lib/utils";

type Row = MatchRow;
type Extracted = ExtractedRequirement;

const SAMPLE = `דרוש/ה מפתח/ת Full Stack
לפחות 3 שנות ניסיון בפיתוח ב-C# ו-.NET
ניסיון ב-React וב-SQL Server
העבודה באזור המרכז, היברידי`;

export function MatchWorkbench({
  initialText = "",
  initialResult = null,
  initialError = null,
}: {
  /** A saved requirement opened from the requirements list, already ranked on the server. */
  initialText?: string;
  initialResult?: MatchResponse | null;
  initialError?: string | null;
}) {
  const [text, setText] = useState(initialText);
  const [rows, setRows] = useState<Row[] | null>(initialResult?.results ?? null);
  const [extracted, setExtracted] = useState<Extracted | null>(initialResult?.requirement ?? null);
  const [total, setTotal] = useState(initialResult?.total ?? 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [campaignOpen, setCampaignOpen] = useState(false);

  const selectedRows = useMemo(
    () => (rows ?? []).filter((r) => selected.has(r.id)),
    [rows, selected],
  );

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "החיפוש נכשל.");
      setRows(json.results);
      setExtracted(json.requirement);
      setTotal(json.total);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = rows != null && rows.length > 0 && selected.size === rows.length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <label htmlFor="req" className="text-[15px] font-bold text-navy">
          טקסט הדרישה
        </label>
        <textarea
          id="req"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="הדביקי כאן את הדרישה כפי שהתקבלה מהמעסיק…"
          className="focus-brand mt-2 w-full resize-y rounded-[22px] border border-ink/20 bg-white px-5 py-4 text-[15px] leading-relaxed placeholder:text-ink/45"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={busy || text.trim().length < 3} withArrow={false}>
            {busy ? "מחפשת…" : "מצא לי מועמדות"}
          </Button>
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="focus-brand rounded-full px-3 py-2 text-[14px] text-primary hover:bg-primary-50"
          >
            נסי עם דוגמה
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
            {error}
          </p>
        )}
      </section>

      {extracted && (
        <section className="rounded-[var(--radius-card)] bg-mint-100 p-6">
          <h2 className="text-[15px] font-bold text-navy">מה זוהה בדרישה</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...extracted.programmingLanguages, ...extracted.technologies].map((t) => (
              <span
                key={t}
                dir="ltr"
                className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-navy"
              >
                {t}
              </span>
            ))}
            {extracted.seniority && <Chip>{extracted.seniority}</Chip>}
            {extracted.regions.length > 0 && <Chip>אזור {extracted.regions.join(" / ")}</Chip>}
            {extracted.minYears != null && <Chip>מינימום {yearsLabel(extracted.minYears)}</Chip>}
            {!extracted.programmingLanguages.length &&
              !extracted.technologies.length &&
              !extracted.seniority &&
              !extracted.regions.length &&
              extracted.minYears == null && (
                <span className="text-[14px] text-ink/70">
                  לא זוהו דרישות ספציפיות — נסי לכתוב טכנולוגיות מפורשות.
                </span>
              )}
          </div>
        </section>
      )}

      {rows && (
        <section className="rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <p className="text-[15px] text-ink/70">
              {/* Every candidate is ranked and returned, so "N מתאימות" used to
                  report the whole database as matching — it read as "you have 5
                  candidates for this role" when three of them matched nothing.
                  Count the ones that actually hit a required skill. */}
              <strong className="text-navy">{rows.filter((r) => r.matched.length > 0).length}</strong>{" "}
              מועמדות עם התאמה · {rows.length} מדורגות מתוך {total} במאגר
              {selected.size > 0 && <> · נבחרו {selected.size}</>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                className="focus-brand rounded-full border border-ink/15 px-4 py-2 text-[14px] font-semibold hover:bg-canvas"
              >
                {allSelected ? "בטלי בחירה" : "סמני הכל"}
              </button>
              <button
                type="button"
                disabled={!selectedRows.length}
                onClick={() => exportCsv(selectedRows)}
                className="focus-brand rounded-full border border-ink/15 px-4 py-2 text-[14px] font-semibold hover:bg-canvas disabled:opacity-40"
              >
                ייצוא רשימה
              </button>
              <ConsentButton
                candidates={selectedRows}
                onMarked={(ids) =>
                  setRows((prev) =>
                    prev ? prev.map((r) => (ids.includes(r.id) ? { ...r, mailable: true } : r)) : prev,
                  )
                }
              />
              <Button
                size="sm"
                withArrow={false}
                disabled={!selectedRows.some((r) => r.mailable)}
                onClick={() => setCampaignOpen(true)}
              >
                שליחת מייל לנבחרות
              </Button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-ink/60">
              לא נמצאו מועמדות שעונות על הדרישה.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/8">
              {rows.map((r) => (
                <li key={r.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-canvas",
                      selected.has(r.id) && "bg-primary-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="focus-brand mt-1.5 h-4 w-4 accent-[var(--color-primary)]"
                      aria-label={`בחירת ${r.name}`}
                    />
                    <span className="grid w-12 shrink-0 place-items-center">
                      <ScoreRing score={r.score} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <strong className="text-[16px] text-navy">{r.name}</strong>
                        {r.institution && (
                          <span className="text-[13px] text-ink/55">
                            {r.institution}
                            {r.cohort ? ` · ${r.cohort}` : ""}
                          </span>
                        )}
                        {mailBlockReason(r) && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-800">
                            {mailBlockReason(r)}
                          </span>
                        )}
                        {r.status === "placed" && (
                          <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[12px] font-semibold text-ink/70">
                            הושמה
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[14px] text-ink/75">{r.reason}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {r.matched.map((t) => (
                          <span
                            key={t}
                            dir="ltr"
                            className="rounded-full bg-mint-100 px-2.5 py-0.5 text-[12px] font-medium text-navy"
                          >
                            {t}
                          </span>
                        ))}
                        {r.missing.map((t) => (
                          <span
                            key={t}
                            dir="ltr"
                            className="rounded-full bg-canvas px-2.5 py-0.5 text-[12px] text-ink/50 line-through"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-[13px] text-ink/55 sm:block" dir="ltr">
                      {r.email}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {campaignOpen && (
        <CampaignDialog
          recipients={selectedRows.filter((r) => r.mailable).map((r) => ({ id: r.id, name: r.name, email: r.email! }))}
          onClose={() => setCampaignOpen(false)}
        />
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-navy">
      {children}
    </span>
  );
}

/** "חצי שנת ניסיון", "שנתיים ניסיון", "3 שנות ניסיון". */
function yearsLabel(years: number): string {
  if (years === 0.5) return "חצי שנת ניסיון";
  if (years === 1) return "שנת ניסיון";
  if (years === 2) return "שנתיים ניסיון";
  return `${years} שנות ניסיון`;
}

function ScoreRing({ score }: { score: number }) {
  const tone = score >= 75 ? "text-mint-600" : score >= 45 ? "text-primary" : "text-ink/35";
  return (
    <span className="relative grid h-11 w-11 place-items-center" title={`ציון התאמה ${score}%`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="4" className="text-ink/10" />
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className={tone}
          strokeDasharray={`${(score / 100) * 106.8} 106.8`}
        />
      </svg>
      <span className="relative text-[12px] font-bold text-navy">{score}</span>
    </span>
  );
}

/** One quoted CSV field. */
function csvCell(value: unknown): string {
  let s = String(value ?? "");
  // Excel runs a cell that starts with = + - @ as a formula, and names and
  // notes are typed by candidates on the public site.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * A phone as a text formula. Excel reads 0527674311 as a number — the leading
 * zero is dropped and long numbers turn into 5.28E+08. `="0527674311"` is kept
 * as text by Excel and by Google Sheets.
 */
function csvPhone(phone: string | null): string {
  const digits = (phone ?? "").replace(/[^\d+\-() ]/g, "");
  return digits ? `"=""${digits}"""` : '""';
}

function exportCsv(rows: Row[]) {
  const header = ["שם", "מייל", "טלפון", "עיר", "אזור", "ניסיון", "בכירות", "מוסד", "שנתון", "ציון", "סיבה"];
  const body = rows.map((r) =>
    [
      csvCell(r.name),
      csvCell(r.email),
      csvPhone(r.phone),
      ...[r.city, r.region, r.experience, r.seniority, r.institution, r.cohort, r.score, r.reason].map(csvCell),
    ].join(","),
  );
  // BOM so Excel opens Hebrew correctly.
  const blob = new Blob(["﻿" + [header.join(","), ...body].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `מועמדות-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
