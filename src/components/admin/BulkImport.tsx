"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { uploadFile } from "@/lib/upload-client";

type Status =
  | "queued"
  | "uploading"
  | "done"
  | "merged"
  | "review"
  | "duplicate"
  | "skipped"
  | "failed";

type FileState = {
  name: string;
  status: Status;
  error?: string;
  retryable?: boolean;
};

const CV_EXT = /\.(pdf|docx?|rtf|txt|odt|png|jpe?g|webp|gif)$/i;
// Word writes a `~$name.docx` lock file next to every open document, and
// macOS/Windows scatter metadata files. They look like CVs by extension; the
// first import turned twelve of them into empty candidates.
const JUNK = /(^|\/)(~\$|\._)[^/]*$|(^|\/)(\.ds_store|thumbs\.db|desktop\.ini)$/i;
const UNSUPPORTED = /\.(heic|heif|pages)$/i;

const CONCURRENCY = 4;

function relativePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
}

export function BulkImport() {
  const csvRef = useRef<HTMLInputElement>(null);
  // The chosen File objects live in a ref (not state): both pickers feed the
  // same queue, and re-rendering the list needs only the names/statuses.
  const chosenRef = useRef<File[]>([]);
  // Set when the run must stop (e.g. no API credit) — every remaining file
  // would fail the same way, and the old import carried on regardless.
  const stopRef = useRef<string | null>(null);
  const [files, setFiles] = useState<FileState[]>([]);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  // A loud reason the import cannot start, as opposed to the quiet notice.
  const [problem, setProblem] = useState<string | null>(null);

  function update(index: number, patch: Partial<FileState>) {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function pick(input: HTMLInputElement) {
    const list = input.files;

    // The folder picker came back with nothing at all — the browser either does
    // not support picking a directory, or she cancelled. Either way, saying
    // nothing leaves her clicking a dead button.
    if (!list?.length) {
      setFiles([]);
      chosenRef.current = [];
      setProblem("לא נבחרו קבצים. אם בחרת תיקייה ולא קרה כלום, נסי בדפדפן Chrome.");
      setNotice(null);
      return;
    }

    const all = Array.from(list);
    const named = (f: File) => relativePath(f) || f.name;
    const junk = all.filter((f) => JUNK.test(named(f)));
    const unsupported = all.filter((f) => !JUNK.test(named(f)) && UNSUPPORTED.test(f.name));
    const chosen = all.filter((f) => !JUNK.test(named(f)) && CV_EXT.test(f.name) && f.size > 0);

    chosenRef.current = chosen;
    setFiles(chosen.map((f) => ({ name: named(f), status: "queued" })));
    setStopped(null);
    input.value = "";

    const notes = [
      junk.length ? `${junk.length} קבצים זמניים של Word/מערכת ידולגו.` : "",
      unsupported.length
        ? `${unsupported.length} קבצי HEIC (צילומי אייפון) או Pages לא נתמכים — אפשר לשמור אותם כ-JPG או PDF ולהוסיף.`
        : "",
    ].filter(Boolean);

    if (!chosen.length) {
      // Everything was filtered out. This used to be one grey line under a
      // disabled button — a folder of 500 CVs read as "nothing happened".
      // Name the formats actually found so the cause is obvious.
      const exts = [
        ...new Set(
          all.map((f) => {
            const m = f.name.match(/\.([^.]+)$/);
            return m ? "." + m[1].toLowerCase() : "(ללא סיומת)";
          }),
        ),
      ].slice(0, 8);
      setProblem(
        `נבחרו ${list.length} קבצים, אבל אף אחד מהם אינו קובץ קורות חיים שאנחנו יודעים לקרוא. ` +
          `הסוגים שנמצאו: ${exts.join(", ")}. ` +
          `נתמכים: PDF, Word (doc/docx), RTF, ODT, טקסט, וצילומים (jpg/png).`,
      );
      setNotice(null);
      return;
    }

    setProblem(null);
    setNotice(
      [`נבחרו ${list.length} קבצים, מתוכם ${chosen.length} נראים כמו קורות חיים.`, ...notes].join(" "),
    );
  }

  async function run(only?: number[]) {
    const chosen = chosenRef.current;
    const queue = only ?? chosen.map((_, i) => i);
    if (!queue.length) return;

    stopRef.current = null;
    setStopped(null);
    setRunning(true);
    let cursor = 0;

    // A small concurrency window keeps memory flat on a thousand-file folder
    // and lets the progress list update as it goes.
    async function worker() {
      while (cursor < queue.length && !stopRef.current) {
        const index = queue[cursor++];
        const file = chosen[index];
        update(index, { status: "uploading", error: undefined });

        try {
          const path = await uploadFile(file, "import");
          if (!path) {
            stopRef.current = "האחסון לא מוגדר בשרת.";
            update(index, { status: "queued" });
            continue;
          }
          const res = await fetch("/api/admin/import/cv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path,
              fileName: file.name,
              relativePath: relativePath(file),
              mime: file.type,
            }),
          });
          // A timeout or gateway error comes back as plain text, not JSON —
          // parsing it used to show an English SyntaxError on the pill.
          const json = await res.json().catch(() => ({
            error: res.status === 504 ? "הקריאה לקחה יותר מדי זמן." : `שגיאת שרת (${res.status}).`,
            retryable: true,
          }));

          if (!res.ok) {
            if (json.fatal) stopRef.current = json.error;
            update(index, {
              status: "failed",
              error: json.error ?? "נכשל",
              retryable: json.retryable !== false,
            });
            continue;
          }

          const status: Status = json.skipped
            ? "skipped"
            : json.duplicate
              ? "duplicate"
              : json.needsReview
                ? "review"
                : json.merged
                  ? "merged"
                  : "done";
          update(index, { status, error: json.reason });
        } catch (err) {
          update(index, {
            status: "failed",
            error: err instanceof Error ? err.message : "שגיאה",
            retryable: true,
          });
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    if (stopRef.current) setStopped(stopRef.current);
  }

  async function importCsv() {
    const file = csvRef.current?.files?.[0];
    if (!file) {
      setCsvResult("בחרי קודם קובץ CSV.");
      return;
    }
    setCsvResult("מייבאת…");
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/admin/import/csv", { method: "POST", body });
      const json = await res.json().catch(() => ({ error: `שגיאת שרת (${res.status}).` }));
      if (!res.ok) throw new Error(json.error ?? "הייבוא נכשל");
      setCsvResult(
        `יובאו ${json.created} רשומות חדשות, ${json.merged} מוזגו לקיימות, ${json.skipped} דולגו.`,
      );
    } catch (err) {
      setCsvResult(err instanceof Error ? err.message : "אירעה שגיאה.");
    }
  }

  const counts = files.reduce<Partial<Record<Status, number>>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1;
    return acc;
  }, {});
  const finished = files.filter((f) => f.status !== "queued" && f.status !== "uploading").length;
  const progress = files.length ? Math.round((finished / files.length) * 100) : 0;
  const started = files.some((f) => f.status !== "queued");
  const pendingIndexes = files.map((f, i) => (f.status === "queued" ? i : -1)).filter((i) => i >= 0);
  const retryIndexes = files
    .map((f, i) => (f.status === "failed" && f.retryable ? i : -1))
    .filter((i) => i >= 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ReparsePanel />

      {/* ------------------------------------------------------------------ */}
      <section className="rounded-[var(--radius-card)] bg-white p-7 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <h2 className="text-[20px] font-bold text-navy">קורות חיים מהמחשב</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
          קבצים בודדים או תיקייה שלמה. PDF, Word, טקסט או סריקות. כל קובץ שנקלט נשמר במקור
          ולא נמחק לעולם. קובץ שכבר יובא בעבר מדולג בלי לשלם עליו שוב.
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.rtf,.txt,.odt,.png,.jpg,.jpeg,.webp,.gif"
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
          <Button withArrow={false} onClick={() => run()} disabled={running || !files.length || started}>
            {running
              ? `מייבאת… ${progress}%`
              : files.length
                ? `התחלת ייבוא (${files.length})`
                : "התחלת ייבוא"}
          </Button>
        </div>

        {/* Files are chosen but nothing has been sent yet. This is the exact
            state Chana sat in: a full list on screen, and no idea a click was
            still required. Say it plainly, right above the list. */}
        {!running && files.length > 0 && !started && (
          <p
            role="status"
            className="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-[14px] font-semibold leading-relaxed text-navy ring-1 ring-primary/20"
          >
            {files.length} קבצים מוכנים — עדיין לא הועלה כלום. לחצי על{" "}
            <span className="whitespace-nowrap">״התחלת ייבוא״</span> כדי להתחיל.
          </p>
        )}

        {stopped && (
          <div
            role="alert"
            className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[14px] font-medium leading-relaxed text-red-800 ring-1 ring-red-200"
          >
            <p>
              <strong>הייבוא נעצר:</strong> {stopped}
            </p>
            {!running && pendingIndexes.length + retryIndexes.length > 0 && (
              <button
                type="button"
                onClick={() => run([...retryIndexes, ...pendingIndexes])}
                className="focus-brand mt-2 rounded-full bg-white px-4 py-1.5 text-[14px] font-semibold text-red-800 ring-1 ring-red-200 hover:bg-red-100"
              >
                המשך ({pendingIndexes.length + retryIndexes.length} קבצים)
              </button>
            )}
          </div>
        )}

        {problem && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-[14px] font-medium leading-relaxed text-amber-900 ring-1 ring-amber-200"
          >
            {problem}
          </p>
        )}
        {notice && <p className="mt-4 text-[14px] text-ink/70">{notice}</p>}

        {started && !running && !stopped && (
          <p role="status" className="mt-4 text-[14px] font-medium text-navy">
            הסתיים: {counts.done ?? 0} נקלטו · {counts.merged ?? 0} מוזגו לקיימות
            {counts.duplicate ? ` · ${counts.duplicate} כבר היו במאגר` : ""}
            {counts.review ? ` · ${counts.review} כדאי לבדוק` : ""}
            {counts.skipped ? ` · ${counts.skipped} דולגו` : ""} · {counts.failed ?? 0} נכשלו.
            {(counts.failed ?? 0) > 0 && " הקבצים שנכשלו לא נוספו למאגר ונשארו במחשב שלך."}
          </p>
        )}

        {!running && !stopped && retryIndexes.length > 0 && (
          <button
            type="button"
            onClick={() => run(retryIndexes)}
            className="focus-brand mt-3 rounded-full border border-ink/20 px-4 py-2 text-[14px] font-semibold hover:bg-canvas"
          >
            ניסיון חוזר ל-{retryIndexes.length} קבצים שנכשלו
          </button>
        )}

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

            <ul className="mt-4 max-h-72 overflow-y-auto text-[13px]">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="py-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-ink/75" dir="auto">
                      {f.name}
                    </span>
                    <StatusPill status={f.status} />
                  </div>
                  {f.error && (f.status === "failed" || f.status === "skipped") && (
                    <p className="ps-2 text-[12px] text-ink/60">{f.error}</p>
                  )}
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
          מסומנות כמי שכבר הסכימו לקבל דיוור — חוץ ממי שהסירה את עצמה מהדיוור. פרטים שכבר
          קיימים במאגר לא נדרסים. רשומה בלי מייל תקין מדולגת ולא נוצרת.
        </div>
      </section>
    </div>
  );
}

/**
 * Files from earlier imports that were never read properly: Word lock files
 * that became empty candidates, and old .doc files read as garbage.
 */
function ReparsePanel() {
  const [docs, setDocs] = useState<{ id: string; fileName: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/import/reparse")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.documents) setDocs(json.documents);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!docs.length && !result) return null;

  async function reparseAll() {
    setRunning(true);
    setResult(null);
    let fixed = 0;
    let hidden = 0;
    let failed = 0;
    let stop: string | null = null;

    for (const [i, doc] of docs.entries()) {
      setDone(i);
      try {
        const res = await fetch("/api/admin/import/reparse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docId: doc.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          failed++;
          if (json.fatal) {
            stop = json.error;
            break;
          }
          continue;
        }
        if (json.hidden) hidden++;
        if (!json.junk) fixed++;
      } catch {
        failed++;
      }
    }

    setRunning(false);
    setDocs([]);
    setResult(
      stop
        ? `נעצר: ${stop}`
        : `הסתיים: ${fixed} קבצים נקראו מחדש · ${hidden} רשומות ריקות הוסתרו` +
            (failed ? ` · ${failed} עדיין לא נקראו` : "") +
            ".",
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-amber-50 p-6 ring-1 ring-amber-200 lg:col-span-2">
      <h2 className="text-[18px] font-bold text-amber-950">קבצים מייבוא קודם שלא נקראו</h2>
      {docs.length > 0 && (
        <>
          <p className="mt-2 text-[15px] leading-relaxed text-amber-950/80">
            {docs.length} קבצים מייבוא קודם נשמרו בלי שנקראו כמו שצריך — רובם קבצים זמניים של
            Word שנוצרו מהם רשומות ריקות. קריאה מחדש תמלא את הפרטים, תמזג כפילויות ותסתיר את
            הרשומות הריקות.
          </p>
          <Button withArrow={false} className="mt-4" onClick={reparseAll} disabled={running}>
            {running ? `קוראת… ${done + 1}/${docs.length}` : "קריאה מחדש"}
          </Button>
        </>
      )}
      {result && <p className="mt-3 text-[15px] font-medium text-amber-950">{result}</p>}
    </section>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    // "ממתין" was read as "the system is processing" — Chana picked 500 files,
    // saw it beside every one, and waited for an import that had never started.
    queued: { label: "מוכן", cls: "bg-canvas text-ink/60" },
    uploading: { label: "מעלה וקורא…", cls: "bg-primary-100 text-primary-700" },
    done: { label: "נקלט", cls: "bg-mint-100 text-navy" },
    merged: { label: "מוזג", cls: "bg-amber-100 text-amber-800" },
    review: { label: "נקלט — כדאי לבדוק", cls: "bg-amber-100 text-amber-900" },
    duplicate: { label: "כבר במאגר", cls: "bg-canvas text-ink/70" },
    skipped: { label: "דולג", cls: "bg-canvas text-ink/60" },
    failed: { label: "נכשל", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
