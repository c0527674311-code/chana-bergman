"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/Field";
import { FileDrop } from "@/components/ui/FileDrop";
import { Button } from "@/components/ui/Button";
import { HOME } from "@/lib/content/site";

type State = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export function EmployerLeadForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/employer-lead", {
        method: "POST",
        body: new FormData(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "שליחת הטופס נכשלה. נסו שוב או שלחו לנו מייל.");
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
        <h3 className="mt-5 text-[22px] font-bold text-navy">קיבלנו את הפנייה!</h3>
        <p className="mt-2 text-[16px] text-ink/70">
          נחזור אליכם עם רשימת מועמדות מתאימות בהקדם.
        </p>
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
    <form onSubmit={onSubmit} noValidate={false} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="שם החברה" name="company_name" required autoComplete="organization" />
        <Input label="שם איש קשר" name="contact_name" autoComplete="name" />
        <Input label="מייל" name="email" type="email" required autoComplete="email" dir="ltr" />
        <Input label="טלפון" name="phone" type="tel" autoComplete="tel" dir="ltr" />
      </div>

      <Textarea label="סוגי תפקידים שאתם מחפשים" name="roles_wanted" rows={4} />

      <div>
        <p className="pb-2 ps-2 text-[15px] font-semibold text-ink">העלאת מסמך דרישות (רשות)</p>
        <FileDrop
          name="attachment"
          label="לחצו כאן להעלאת המסמך"
          accept=".pdf,.doc,.docx,.txt,.rtf,image/*"
        />
      </div>

      {state.kind === "error" && (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
          {state.message}
        </p>
      )}

      <div className="mt-2 flex justify-center">
        <Button type="submit" size="md" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "שולח…" : HOME.contact.submit}
        </Button>
      </div>

      <p className="text-center text-[13px] text-ink/55">
        הפרטים נשמרים אצלנו בלבד ומשמשים ליצירת קשר בנוגע לדרישה הזו.
      </p>
    </form>
  );
}
