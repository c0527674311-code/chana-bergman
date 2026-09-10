"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Honeypot } from "@/components/ui/Honeypot";

type State = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

/** The homepage "שאלות?" form — a personal inquiry, per the design. */
export function CandidateContactForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/inquiry", { method: "POST", body: new FormData(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "השליחה נכשלה. נסי שוב או כתבי לנו מייל.");
      form.reset();
      setState({ kind: "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "אירעה שגיאה." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-10 text-center shadow-[var(--shadow-card)]">
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
        <h3 className="mt-5 text-[22px] font-bold text-navy">הפנייה התקבלה!</h3>
        <p className="mt-2 text-[16px] text-ink/70">נשוב אלייך בהקדם.</p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="focus-brand mt-6 rounded-full px-4 py-2 text-[15px] font-semibold text-primary hover:bg-primary-50"
        >
          שליחת פנייה נוספת
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="שם פרטי" name="first_name" required autoComplete="given-name" />
        <Input label="שם משפחה" name="last_name" autoComplete="family-name" />
        <Input label="מייל" name="email" type="email" required autoComplete="email" dir="ltr" />
        <Input label="טלפון" name="phone" type="tel" autoComplete="tel" dir="ltr" />
      </div>
      <Textarea label="תיאור הפנייה" name="message" rows={4} required />

      {state.kind === "error" && (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
          {state.message}
        </p>
      )}

      <div className="mt-1 flex justify-center">
        <Button type="submit" size="md" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "שולחת…" : "אשמח שתחזרו אלי"}
        </Button>
      </div>
    </form>
  );
}
