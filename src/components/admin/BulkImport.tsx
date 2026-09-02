"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type FileState = {
  name: string;
  status: "queued" | "uploading" | "done" | "merged" | "unparsed" | "failed";
  error?: string;
};

const CV_EXT = /\.(pdf|docx?|rtf|txt|odt|pages|png|jpe?g|heic|webp)$/i;

export function BulkImport() {
  const csvRef = useRef<HTMLInputElement>(null);
  // The chosen File objects live in a ref (not state): both pickers feed the
  // same queue, and re-rendering the list needs only the names/statuses.
  const chosenRef = useRef<File[]>([]);
  const [files, setFiles] = useState<FileState[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  function pick(input: HTMLInputElement) {
    const list = input.files;
    if (!list?.length) return;
    const chosen = Array.from(list).filter((f) => CV_EXT.test(f.name) && f.size > 0);
    chosenRef.current = chosen;
    setFiles(chosen.map((f) => ({ name: f.name, status: "queued" })));
    setSummary(
      `נבחרו ${list.length} קבצים, מתוכם ${chosen.length} נראים כמו קורות חיים. ` +
        `${list.length - chosen.length} קבצים אחרים ידולגו.`,
    );
    // Allow picking the same folder/files again after a run.
    input.value = "";
  }

  async function run() {
    const chosen = chosenRef.current;
    if (!chosen.length) return;

    setRunning(true);
    let done = 0;
    let merged = 0;
    let unparsed = 0;
    let failed = 0;

    // Sequential with a small concurrency window keeps memory flat on a
    // thousand-file folder and lets the progress list update as it goes.
    const CONCURRENCY = 4;
    let cursor = 0;

    async function worker() {
      while (cursor < chosen.length) {
        const index = cursor++;
        const file = chosen[index];
        setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f)));

        const body = new FormData();
        body.set("file", file);
        body.set("relativePath", (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "");

        try {
          const res = await fetch("/api/admin/import/cv", { method: "POST", body });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "נכשל");
          // Stored but unreadable is its own outcome — not a success.
          const status: FileState["status"] = json.parsed === false
            ? "unparsed"
            : json.merged
              ? "merged"
              : "done";
          if (status === "unparsed") unparsed++;
          else if (json.merged) merged++;
          else done++;
          setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status } : f)));
        } catch (err) {
          failed++;
          setFiles((prev) =>
            prev.map((f, i) =>
              i === index
                ? { ...f, status: "failed", error: err instanceof Error ? err.message : "שגיאה" }
                : f,
            ),
          );
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    setSummary(
      `הסתיים: ${chosen.length} קבצים · ${done} נקלטו · ${merged} כפולות מוזגו` +
        (unparsed ? ` · ${unparsed} נשמרו אך לא נקראו` : "") +
        ` · ${failed} נכשלו.`,
    );
  }

  async function importCsv() {
    const file = csvRef.current?.files?.[0];
    if (!file) return;
    setCsvResult("מייבאת…");
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/admin/import/csv", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "הייבוא נכשל");
      setCsvResult(
        `יובאו ${json.created} רשומות חדשות, ${json.merged} מוזגו לקיימות, ${json.skipped} דולגו.`,
      );
    } catch (err) {
      setCsvResult(err instanceof Error ? err.message : "אירעה שגיאה.");
    }
  }

  const counts = files.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1;
    return acc;
  }, {});
  // Every terminal state counts toward progress — leaving "unparsed" out left
  // the bar stuck short of 100% on any folder that had an unreadable file.
  const progress = files.length
    ? Math.round(
        (((counts.done ?? 0) + (counts.merged ?? 0) + (counts.unparsed ?? 0) + (counts.failed ?? 0)) /
          files.length) *
          100,
      )
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-[var(--radius-card)] bg-white p-7 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <h2 className="text-[20px] font-bold text-navy">קורות חיים מהמחשב</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
          קבצים בודדים או תיקייה שלמה. PDF, Word, טקסט או סריקות. כל קובץ נשמר במקור ולא
          נמחק לעולם.
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.rtf,.txt,.odt,.pages,.png,.jpg,.jpeg,.heic,.webp"
          className="sr-only"
          id="cv-files"
          onChange={(e) => pick(e.currentTarget)}
        />
        <input
          type="file"
          multiple
          // @ts-expect-error — non-standard but supported in Chrome/Edge/Safari
          webkitdirectory=""
          directory=""
          className="sr-only"
          id="folder"
          onChange={(e) => pick(e.currentTarget)}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <label
            htmlFor="cv-files"
            className="focus-brand cursor-pointer rounded-full border border-ink/20 px-5 py-2.5 text-[15px] font-semibold hover:bg-canvas"
          >
            בחירת קבצים
          </label>
          <label
            htmlFor="folder"
            className="focus-brand cursor-pointer rounded-full border border-ink/20 px-5 py-2.5 text-[15px] font-semibold hover:bg-canvas"
          >
            בחירת תיקייה
          </label>
          <Button withArrow={false} onClick={run} disabled={running || !files.length}>
            {running ? `מעלה… ${progress}%` : "התחלת ייבוא"}
          </Button>
        </div>

        {summary && <p className="mt-4 text-[14px] text-ink/70">{summary}</p>}

        {files.length > 0 && (
          <>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-canvas"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="התקדמות הייבוא"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ul className="mt-4 max-h-64 overflow-y-auto text-[13px]">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 py-1">
                  <span className="truncate text-ink/75">{f.name}</span>
                  <StatusPill status={f.status} error={f.error} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="rounded-[var(--radius-card)] bg-white p-7 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <h2 className="text-[20px] font-bold text-navy">רשימת מיילים מסמוב (CSV)</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
          מייצאים מסמוב לקובץ CSV ומעלים כאן. המערכת מזהה את העמודות שם / מייל / טלפון /
          שנתון, וממזגת עם מי שכבר במאגר.
        </p>

        <input ref={csvRef} type="file" accept=".csv,text/csv" className="sr-only" id="csv" />
        <div className="mt-5 flex flex-wrap gap-3">
          <label
            htmlFor="csv"
            className="focus-brand cursor-pointer rounded-full border border-ink/20 px-5 py-2.5 text-[15px] font-semibold hover:bg-canvas"
          >
            בחירת קובץ CSV
          </label>
          <Button withArrow={false} variant="outline" onClick={importCsv}>
            ייבוא הרשימה
          </Button>
        </div>

        {csvResult && <p className="mt-4 text-[14px] font-medium text-navy">{csvResult}</p>}

        <div className="mt-6 rounded-2xl bg-canvas p-4 text-[13px] leading-relaxed text-ink/70">
          <strong className="text-navy">שימי לב:</strong> רשומות שיובאו מרשימת דיוור קיימת
          מסומנות כמי שכבר הסכימו לקבל דיוור. רשומה בלי מייל תקין מדולגת ולא נוצרת.
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status, error }: { status: FileState["status"]; error?: string }) {
  const map: Record<FileState["status"], { label: string; cls: string }> = {
    queued: { label: "ממתין", cls: "bg-canvas text-ink/60" },
    uploading: { label: "מעלה…", cls: "bg-primary-100 text-primary-700" },
    done: { label: "נקלט", cls: "bg-mint-100 text-navy" },
    merged: { label: "מוזג", cls: "bg-amber-100 text-amber-800" },
    unparsed: { label: "נשמר — לא נקרא", cls: "bg-amber-100 text-amber-900" },
    failed: { label: "נכשל", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status];
  return (
    <span title={error} className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
