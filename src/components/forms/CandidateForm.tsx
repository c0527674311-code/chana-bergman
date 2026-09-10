"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { FileDrop } from "@/components/ui/FileDrop";
import { VoiceRecorder } from "./VoiceRecorder";
import { CandidateProfileFields } from "./CandidateProfileFields";
import { extractFromTranscript } from "@/lib/voice-extract";
import type { Candidate } from "@/lib/types";

type State = { kind: "idle" | "saving" } | { kind: "error"; message: string } | { kind: "done" };
type ScanState = "idle" | "scanning" | "done" | "unavailable" | "failed" | "voice-fallback";

/**
 * One form, two jobs: anonymous CV submission (`mode="submit"`) and editing an
 * existing profile (`mode="edit"`). Both post to /api/candidate, which runs
 * dedup before writing.
 *
 * Submit flow is upload-first: the moment a file is chosen it is sent to
 * /api/parse-cv, and the extracted fields become the form's new defaults (the
 * fields block is remounted via `key`). The candidate reviews, fixes anything
 * the scan got wrong, and submits. The scan failing never blocks submission.
 */
export function CandidateForm({
  candidate,
  mode = "submit",
  submitLabel,
}: {
  candidate?: Partial<Candidate> | null;
  mode?: "submit" | "edit";
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [scan, setScan] = useState<ScanState>("idle");
  const [prefill, setPrefill] = useState<Partial<Candidate> | null>(null);
  const [prefillVersion, setPrefillVersion] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  function applyParsed(f: Record<string, unknown>) {
    // Keep only fields the scan actually found, so a partial parse doesn't
    // blank out values the candidate already typed.
    const next: Partial<Candidate> = {};
    if (f.first_name) next.first_name = f.first_name as string;
    if (f.last_name) next.last_name = f.last_name as string;
    if (f.email) next.email = f.email as string;
    if (f.phone) next.phone = f.phone as string;
    if (f.city) next.city = f.city as string;
    if (f.preferred_regions) next.preferred_regions = f.preferred_regions as string[];
    if (f.experience_years) next.experience_years = f.experience_years as string;
    if ((f.programming_languages as string[])?.length)
      next.programming_languages = f.programming_languages as string[];
    if ((f.technologies as string[])?.length) next.technologies = f.technologies as string[];
    if ((f.spoken_languages as string[])?.length)
      next.spoken_languages = f.spoken_languages as string[];
    // Merge on top of whatever is already pre-filled (e.g. the instant local
    // extraction from a voice transcript) — the model wins per field.
    setPrefill((p) => ({ ...p, ...next }));
    setPrefillVersion((v) => v + 1);
  }

  async function parseWith(file: File, voice: boolean): Promise<"done" | "unavailable" | "failed"> {
    const body = new FormData();
    body.set("file", file);
    if (voice) body.set("voice", "1");
    const res = await fetch("/api/parse-cv", { method: "POST", body });
    if (res.status === 503) return "unavailable";
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.fields) return "failed";
    applyParsed(json.fields);
    return "done";
  }

  async function onCvFile(file: File | null) {
    if (!file) return;
    setScan("scanning");
    try {
      setScan(await parseWith(file, false));
    } catch {
      setScan("failed");
    }
  }

  async function onVoiceTranscript(transcript: string) {
    setVoiceTranscript(transcript);

    // Instant local extraction — fills fields immediately, no server needed.
    const local = extractFromTranscript(transcript);
    const localHits = Object.keys(local).length;
    if (localHits) {
      setPrefill((p) => ({ ...p, ...local }));
      setPrefillVersion((v) => v + 1);
    }

    // Then let the model refine (it merges on top when available).
    setScan("scanning");
    try {
      const result = await parseWith(
        new File([transcript], "voice-transcript.txt", { type: "text/plain" }),
        true,
      );
      if (result === "done") {
        // The model reads the rest of a recording well, but drops a Latin letter
        // spoken in Hebrew ("סי" for c) and keeps recognizer hyphens between
        // digits. The local extractor handles both deterministically, so for
        // the address specifically it wins.
        if (local.email) {
          setPrefill((p) => ({ ...p, email: local.email }));
          setPrefillVersion((v) => v + 1);
        }
        setScan("done");
        return;
      }
      // Model unavailable — keep the local fill, and preserve her words in the
      // notes field so nothing she said is lost.
      setPrefill((p) => ({ ...p, notes_from_candidate: transcript, ...local }));
      setPrefillVersion((v) => v + 1);
      setScan(localHits ? "done" : "voice-fallback");
    } catch {
      setPrefill((p) => ({ ...p, notes_from_candidate: transcript, ...local }));
      setPrefillVersion((v) => v + 1);
      setScan(localHits ? "done" : "voice-fallback");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ kind: "saving" });
    const body = new FormData(form);
    body.set("mode", mode);

    try {
      const res = await fetch("/api/candidate", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "השמירה נכשלה. נסי שוב.");
      if (mode === "edit") {
        router.refresh();
        setState({ kind: "done" });
      } else {
        form.reset();
        setPrefill(null);
        setVoiceTranscript("");
        setScan("idle");
        setState({ kind: "done" });
      }
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "אירעה שגיאה." });
    }
  }

  // The success panel replaces the whole form, so the page gets much shorter and
  // a candidate who just pressed submit at the bottom is left staring at the
  // footer with no confirmation in sight. Three browser behaviours to handle,
  // all confirmed by measuring on the deployed page:
  //
  //  * globals.css sets `scroll-behavior: smooth` on <html>, and a smooth
  //    programmatic scroll from here never runs at all. "instant" overrides the
  //    CSS per spec and does move the page.
  //  * Scrolling on the frame right after commit gets clamped away — the
  //    document is still shrinking, so we get pinned to the old maximum.
  //  * requestAnimationFrame does not fire while the tab is hidden, so a
  //    rAF-only version silently does nothing for anyone who submits and then
  //    switches tabs. Timers still fire, so drive it from both.
  //
  // Hence: attempt on the next frame and on a timer, then verify once and
  // correct. Re-scrolling to a spot we already occupy is a no-op, so the
  // overlap is harmless.
  const successRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const bring = () => node.scrollIntoView({ behavior: "instant", block: "center" });
    requestAnimationFrame(() => requestAnimationFrame(bring));
    window.setTimeout(bring, 60);
    window.setTimeout(() => {
      const { top, bottom } = node.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) bring();
    }, 250);
    node.focus({ preventScroll: true });
  }, []);

  if (state.kind === "done" && mode === "submit") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="focus-brand rounded-[var(--radius-card)] bg-mint-100 p-10 text-center"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-navy">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="mt-5 text-[24px] font-bold text-navy">קיבלנו את קורות החיים שלך!</h2>
        <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-ink/75">
          את נמצאת במאגר. כשתגיע דרישה שמתאימה לך — חנה תפנה אלייך ישירות.
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="focus-brand mt-6 rounded-full px-4 py-2 text-[15px] font-semibold text-primary hover:bg-white/60"
        >
          שליחת קורות חיים נוספים
        </button>
      </div>
    );
  }

  const uploadBlock = (
    <div className={mode === "submit" ? "" : "pt-2"}>
      <p className="pb-2 text-[16px] font-bold text-navy">
        {mode === "submit" ? "קורות חיים — העלי קובץ ונמלא את הפרטים בשבילך" : "קורות חיים"}
      </p>
      <FileDrop
        name="cv"
        required={mode === "submit" && !voiceTranscript}
        onFileChange={onCvFile}
      />

      {mode === "submit" && (
        <div className="mt-3">
          <VoiceRecorder onTranscript={onVoiceTranscript} disabled={scan === "scanning"} />
        </div>
      )}

      {scan === "scanning" && (
        <p role="status" className="mt-2 flex items-center gap-2 ps-2 text-[14px] font-medium text-primary">
          <Spinner /> ממלאת את הפרטים…
        </p>
      )}
      {scan === "done" && (
        <p role="status" className="mt-2 rounded-2xl bg-mint-100 px-4 py-2.5 text-[14px] font-semibold text-navy">
          הפרטים מולאו אוטומטית — עברי עליהם, תקני אם צריך, ואשרי למטה.
          {voiceTranscript && " בהקלטה קשה לזהות אותיות באנגלית — בדקי במיוחד את כתובת המייל."}
        </p>
      )}
      {scan === "failed" && (
        <p role="status" className="mt-2 rounded-2xl bg-canvas px-4 py-2.5 text-[14px] text-ink/70">
          לא הצלחנו לקרוא את הקובץ אוטומטית — אפשר למלא את הפרטים ידנית, הקובץ עצמו יישלח כרגיל.
        </p>
      )}
      {/* 503 from /api/parse-cv means the scan is switched off server-side (no
          ANTHROPIC_API_KEY), not that this particular file was unreadable.
          Saying "we could not read your file" there sends candidates off to
          re-export and re-upload a file that was never the problem. */}
      {scan === "unavailable" && (
        <p role="status" className="mt-2 rounded-2xl bg-canvas px-4 py-2.5 text-[14px] text-ink/70">
          המילוי האוטומטי כבוי כרגע — לא משהו בקובץ שלך. מלאי את הפרטים ידנית,
          והקובץ עצמו יישלח ויישמר כרגיל.
        </p>
      )}
      {scan === "voice-fallback" && (
        <p role="status" className="mt-2 rounded-2xl bg-canvas px-4 py-2.5 text-[14px] text-ink/70">
          ההקלטה נקלטה והתמלול נשמר בשדה ההערות — מלאי את שאר הפרטים ידנית ואשרי.
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Rides along on submit; stored server-side as the CV document when no file was attached. */}
      <input type="hidden" name="voice_transcript" value={voiceTranscript} />

      {mode === "submit" && uploadBlock}

      {/* Remounts with the scanned values as fresh defaults. */}
      <CandidateProfileFields
        key={prefillVersion}
        candidate={prefill ? { ...candidate, ...prefill } : candidate}
      />

      {mode === "edit" && uploadBlock}

      {mode === "submit" && (
        // Joining the pool means agreeing to hear about jobs — that is the whole
        // service. Required, and left unticked so the agreement is her own act
        // rather than a box she never noticed; the server enforces it too.
        <Checkbox
          name="consent_marketing"
          required
          label={
            <>
              אני מאשרת קבלת עדכונים על משרות רלוונטיות במייל{" "}
              <span className="font-semibold text-navy">(חובה להצטרפות למאגר)</span>. אפשר
              להסיר את עצמך בכל רגע מקישור בתחתית כל מייל.
            </>
          }
        />
      )}

      {state.kind === "error" && (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
          {state.message}
        </p>
      )}

      {state.kind === "done" && mode === "edit" && (
        <p className="rounded-2xl bg-mint-100 px-5 py-3 text-[14px] font-semibold text-navy">
          הפרטים נשמרו בהצלחה.
        </p>
      )}

      <div className="flex justify-center pt-2">
        <Button type="submit" size="lg" withArrow={false} disabled={state.kind === "saving"}>
          {state.kind === "saving"
            ? "שולחת…"
            : (submitLabel ?? "חנה, מעוניינת להצטרף למאגר :)")}
        </Button>
      </div>
    </form>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 animate-spin" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M18 10a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
