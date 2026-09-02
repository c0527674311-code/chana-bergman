"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Voice intake: the candidate speaks her details and the browser's speech
 * recognition (he-IL) transcribes live. When she stops, the transcript goes to
 * the same parse pipeline as an uploaded file and pre-fills the form.
 *
 * Uses the Web Speech API — supported in Chrome, Edge and Safari; on browsers
 * without it (Firefox) the control explains itself instead of breaking.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onstart: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type Phase = "idle" | "starting" | "recording" | "unsupported" | "denied" | "empty";

export function VoiceRecorder({
  onTranscript,
  disabled = false,
}: {
  /** Called once, with the full transcript, when the candidate stops. */
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  // Why recognition produced nothing. Without this every failure — no mic,
  // Hebrew unsupported, speech service unreachable — looked identical to
  // "you said nothing", and there was no way to act on it.
  const [failure, setFailure] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const finalRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      setPhase("unsupported");
    }
    return () => {
      activeRef.current = false;
      recRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function start() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    // Ask for the microphone explicitly first.
    //
    // Recognition used to be started straight away and the UI flipped to
    // "recording" on the same line. But the permission prompt is asynchronous:
    // if she never answered it, the browser fired neither onstart nor onerror —
    // so a timer ran, nothing was captured, and there was no error to report.
    // getUserMedia gives a definite yes/no before anything else happens.
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Recognition opens its own capture; release this one immediately.
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setFailure(name === "NotFoundError" ? "audio-capture" : "not-allowed");
      setPhase(name === "NotFoundError" ? "empty" : "denied");
      return;
    }

    const rec = new Ctor();
    rec.lang = "he-IL";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      setFinalText(finalRef.current);
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      const code = event.error ?? "unknown";
      setFailure(code);

      if (code === "not-allowed" || code === "service-not-allowed") {
        activeRef.current = false;
        setPhase("denied");
        return;
      }
      // These cannot recover by restarting, and letting onend retry forever
      // just spins until she gives up. Stop and let stop() explain.
      if (code === "audio-capture" || code === "network" || code === "language-not-supported") {
        activeRef.current = false;
        return;
      }
      // "no-speech" and "aborted" are normal mid-dictation — onend restarts.
    };

    // Chrome ends recognition after silence; keep going until she presses stop.
    rec.onend = () => {
      if (activeRef.current) {
        try {
          rec.start();
        } catch {
          /* already restarting */
        }
      }
    };

    finalRef.current = "";
    setFinalText("");
    setInterim("");
    setFailure(null);
    setSeconds(0);
    activeRef.current = true;
    recRef.current = rec;
    // The badge and the timer wait for the engine to confirm it is listening,
    // so "מקליטה…" always means audio is actually being captured.
    rec.onstart = () => {
      setPhase("recording");
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      }
    };
    rec.start();
  }

  function stop() {
    activeRef.current = false;
    recRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);

    // Chrome often has not promoted the last phrase to `isFinal` by the time she
    // presses stop. Dropping `interim` here threw away whole short recordings.
    const transcript = [finalRef.current, interim].join(" ").trim();
    setInterim("");

    if (transcript.length < 10) {
      // Previously this returned silently: she spoke, pressed stop, and nothing
      // whatsoever happened. Say what went wrong instead.
      setPhase("empty");
      return;
    }

    setPhase("idle");
    onTranscript(transcript);
  }

  if (phase === "unsupported") {
    return (
      <p className="rounded-2xl bg-canvas px-4 py-3 text-[13.5px] leading-relaxed text-ink/60">
        הקלטה קולית זמינה בדפדפני Chrome, Edge ו-Safari. בדפדפן הזה אפשר להעלות קובץ או
        למלא ידנית.
      </p>
    );
  }

  if (phase === "denied") {
    return (
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
        הדפדפן חסם את הגישה למיקרופון. אפשרי אותה בהגדרות האתר ונסי שוב, או העלי קובץ במקום.
      </p>
    );
  }

  if (phase === "empty") {
    // Say which wall we hit. "Try again" is useless advice when the browser
    // has no microphone, cannot reach the speech service, or does not speak
    // Hebrew — each of those needs a different action from her.
    const explanation =
      failure === "audio-capture"
        ? "לא נמצא מיקרופון פעיל במחשב. בדקי שהוא מחובר ושהוא נבחר בהגדרות הקול, ונסי שוב."
        : failure === "network"
          ? "הדפדפן לא הצליח להגיע לשירות התמלול. בדקי את החיבור לאינטרנט ונסי שוב — או פשוט העלי קובץ במקום."
          : failure === "language-not-supported"
            ? "הדפדפן הזה לא תומך בתמלול עברית. ב-Chrome זה עובד — או שאפשר להעלות קובץ במקום."
            : "לא קלטנו דיבור בהקלטה. ודאי שהמיקרופון פועל ושדיברת אחרי הלחיצה, ונסי שוב.";

    return (
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <p>{explanation}</p>
        <button
          type="button"
          onClick={start}
          className="focus-brand mt-2 rounded-full bg-navy px-4 py-1.5 text-[13.5px] font-bold text-white hover:bg-ink"
        >
          להקליט שוב
        </button>
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="rounded-[22px] border-2 border-primary bg-primary-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[15px] font-bold text-navy">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            מקליטה… {format(seconds)}
          </span>
          <button
            type="button"
            onClick={stop}
            className="focus-brand rounded-full bg-navy px-5 py-2 text-[14px] font-bold text-white hover:bg-ink"
          >
            סיימתי ■
          </button>
        </div>

        <p className="mt-3 min-h-[3.5rem] rounded-2xl bg-white px-4 py-3 text-[14px] leading-relaxed text-ink/85">
          {finalText}
          <span className="text-ink/45">{interim}</span>
          {!finalText && !interim && (
            <span className="text-ink/45">
              ספרי לנו: שם מלא, טלפון, מייל, עיר, מה למדת ואיפה, אילו שפות תכנות
              וטכנולוגיות את יודעת, וכמה שנות ניסיון יש לך…
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || phase === "starting"}
      className="focus-brand flex w-full items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-ink/20 bg-white px-5 py-4 transition-colors hover:border-primary/50 disabled:opacity-50"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-navy">
        <MicIcon />
      </span>
      <span className="text-start">
        <span className="block text-[15px] font-bold text-primary">
          {phase === "starting" ? "מבקש גישה למיקרופון…" : "או ספרי לנו בקול — ואנחנו נמלא >"}
        </span>
        <span className="block text-[13px] text-ink/60">
          מקליטים, המערכת ממלאת את השדות, ואת רק מתקנת
        </span>
      </span>
    </button>
  );
}

function format(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="7" y="2.5" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 10a5.5 5.5 0 0 0 11 0M10 15.5v2.5M7.5 18h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
