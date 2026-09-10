"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { CvSheet } from "@/components/cv/CvSheet";
import {
  CV_TEMPLATES,
  EMPTY_CV,
  hasRealContent,
  withSample,
  type CvData,
  type CvTemplateId,
} from "@/lib/cv-builder";
import { cn } from "@/lib/utils";

type Checkout = { mode: "free" } | { mode: "paid"; price: number; url: string };

export function CvBuilder() {
  const [data, setData] = useState<CvData>(EMPTY_CV);
  const [template, setTemplate] = useState<CvTemplateId>("clean");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [payDialog, setPayDialog] = useState<Checkout | null>(null);
  const [scale, setScale] = useState(0.5);
  // Client-only flag without setState-in-effect: the print copy is portalled
  // into <body>, which does not exist during server rendering.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const previewRef = useRef<HTMLDivElement>(null);

  // Load the pricing config up front so the button can show the price.
  useEffect(() => {
    fetch("/api/cv-builder/checkout")
      .then((res) => res.json())
      .then((c: Checkout) => setCheckout(c))
      .catch(() => setCheckout({ mode: "free" }));
  }, []);

  // Fit the A4 sheet (210mm ≈ 794px) to the preview column width.
  useEffect(() => {
    function fit() {
      const w = previewRef.current?.clientWidth ?? 0;
      if (w) setScale(Math.min(1, w / 794));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  function set<K extends keyof CvData>(key: K, value: CvData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setExp(i: number, key: keyof CvData["experience"][number], value: string) {
    setData((d) => {
      const experience = d.experience.map((e, j) => (j === i ? { ...e, [key]: value } : e));
      return { ...d, experience };
    });
  }

  function setEdu(i: number, key: keyof CvData["education"][number], value: string) {
    setData((d) => {
      const education = d.education.map((e, j) => (j === i ? { ...e, [key]: value } : e));
      return { ...d, education };
    });
  }

  async function download() {
    let c = checkout;
    if (!c) {
      // Clicked before the config loaded — fetch it now, fall back to free.
      try {
        c = (await (await fetch("/api/cv-builder/checkout")).json()) as Checkout;
        setCheckout(c);
      } catch {
        c = { mode: "free" };
      }
    }
    if (c.mode === "paid") setPayDialog(c);
    else window.print();
  }

  const preview = withSample(data);
  const ready = hasRealContent(data);
  const isSample = !ready;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,46%)_minmax(0,54%)]">
      {/* ---------------------------------------------------------------- */}
      {/* Form                                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-col gap-6">
        <Fieldset title="פרטים אישיים">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם מלא" value={data.fullName} onChange={(v) => set("fullName", v)} />
            <Field label="תפקיד (למשל: מפתחת Full Stack)" value={data.title} onChange={(v) => set("title", v)} />
            <Field label="מייל" value={data.email} onChange={(v) => set("email", v)} ltr type="email" />
            <Field label="טלפון" value={data.phone} onChange={(v) => set("phone", v)} ltr type="tel" />
            <Field label="עיר" value={data.city} onChange={(v) => set("city", v)} className="sm:col-span-2" />
          </div>
        </Fieldset>

        <Fieldset title="תמצית" hint="שתיים-שלוש שורות: מי את, כמה ניסיון, ומה את מחפשת.">
          <Area value={data.summary} onChange={(v) => set("summary", v)} rows={3} label="תמצית מקצועית" />
        </Fieldset>

        <Fieldset title="ניסיון תעסוקתי">
          <div className="flex flex-col gap-5">
            {data.experience.map((e, i) => (
              <div key={i} className="rounded-2xl bg-canvas p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="תפקיד" value={e.role} onChange={(v) => setExp(i, "role", v)} />
                  <Field label="חברה" value={e.company} onChange={(v) => setExp(i, "company", v)} />
                  <Field label="משנה (למשל: 2023)" value={e.from} onChange={(v) => setExp(i, "from", v)} ltr />
                  <Field label="עד (למשל: היום)" value={e.to} onChange={(v) => setExp(i, "to", v)} />
                </div>
                <Area
                  className="mt-3"
                  rows={2}
                  label="מה עשית שם — טכנולוגיות, אחריות, הישג אחד"
                  value={e.description}
                  onChange={(v) => setExp(i, "description", v)}
                />
                {data.experience.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        experience: d.experience.filter((_, j) => j !== i),
                      }))
                    }
                    className="focus-brand mt-2 rounded-full px-3 py-1 text-[13px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    הסרת תפקיד
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  experience: [...d.experience, { role: "", company: "", from: "", to: "", description: "" }],
                }))
              }
              className="focus-brand self-start rounded-full border border-ink/15 px-4 py-2 text-[14px] font-semibold hover:bg-canvas"
            >
              + הוספת תפקיד
            </button>
          </div>
        </Fieldset>

        <Fieldset title="השכלה">
          <div className="flex flex-col gap-4">
            {data.education.map((e, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                <Field label="תואר / תעודה" value={e.degree} onChange={(v) => setEdu(i, "degree", v)} />
                <Field label="מוסד" value={e.institution} onChange={(v) => setEdu(i, "institution", v)} />
                <Field label="שנה" value={e.year} onChange={(v) => setEdu(i, "year", v)} ltr />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  education: [...d.education, { degree: "", institution: "", year: "" }],
                }))
              }
              className="focus-brand self-start rounded-full border border-ink/15 px-4 py-2 text-[14px] font-semibold hover:bg-canvas"
            >
              + הוספת לימודים
            </button>
          </div>
        </Fieldset>

        <Fieldset
          title="כישורים ושפות"
          hint="רשימה שטוחה ומפורשת — זה הסעיף שמערכות הסינון קוראות."
        >
          <Field
            label="טכנולוגיות (מופרדות בפסיק): C#, .NET, React…"
            value={data.skills}
            onChange={(v) => set("skills", v)}
            ltr
          />
          <Field
            className="mt-3"
            label="שפות: עברית — שפת אם · אנגלית — טובה"
            value={data.languages}
            onChange={(v) => set("languages", v)}
          />
        </Fieldset>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Preview + template picker + download                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="בחירת תבנית">
            {CV_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={template === t.id}
                onClick={() => setTemplate(t.id)}
                title={t.note}
                className={cn(
                  "focus-brand rounded-full px-4 py-2 text-[14px] font-semibold transition-colors",
                  template === t.id
                    ? "bg-primary text-white"
                    : "border border-ink/15 bg-white hover:bg-canvas",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-ink/55">
            {CV_TEMPLATES.find((t) => t.id === template)?.note}
          </p>
        </div>

        <div ref={previewRef} className="overflow-hidden rounded-[22px] bg-ink/5 p-3">
          {isSample && (
            <p className="pb-2 text-center text-[13px] font-medium text-ink/55">
              תצוגה מקדימה עם תוכן לדוגמה — מתחלף בפרטים שלך תוך כדי הקלדה
            </p>
          )}
          <div
            style={{ height: `${297 * 3.7795 * scale + 24}px` }}
            className="flex justify-center overflow-hidden"
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
              <div className="shadow-[var(--shadow-card)]">
                <CvSheet data={preview} template={template} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button size="lg" withArrow={false} onClick={download} disabled={!ready}>
            הורדת קורות החיים כ-PDF
            {checkout?.mode === "paid" && ` · ₪${checkout.price}`}
          </Button>
          {checkout?.mode === "paid" && (
            <p className="text-center text-[13px] text-ink/55">
              תשלום חד־פעמי — כל התבניות כלולות בהורדה.
            </p>
          )}
          {!ready && (
            <p className="text-center text-[13px] text-ink/55">
              מלאי לפחות שם מלא ודרך התקשרות כדי להוריד.
            </p>
          )}
          <p className="max-w-sm text-center text-[13px] leading-relaxed text-ink/55">
            רוצה שחנה תמצא לך משרה עם הקובץ הזה?{" "}
            <Link href="/submit-cv" className="focus-brand rounded font-semibold text-primary hover:underline">
              שלחי אותו למאגר
            </Link>{" "}
            אחרי ההורדה.
          </p>
        </div>
      </div>

      {payDialog?.mode === "paid" && (
        <PayDialog
          price={payDialog.price}
          url={payDialog.url}
          onClose={() => setPayDialog(null)}
          onPaid={() => {
            setPayDialog(null);
            window.print();
          }}
        />
      )}

      {/* What actually gets printed. The on-screen preview lives inside a
          scale() transform and a clipped, fixed-height box; printing that
          element gave a blank first page and the CV shrunk across four pages.
          This copy sits directly under <body>, untransformed, at true A4. */}
      {isClient &&
        createPortal(
          <div id="cv-print-root" aria-hidden="true">
            <CvSheet data={preview} template={template} print />
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PayDialog({
  price,
  url,
  onClose,
  onPaid,
}: {
  price: number;
  url: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-title"
      className="fixed inset-0 z-[60] grid place-items-center bg-navy/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <h2 id="pay-title" className="text-[22px] font-extrabold text-navy">
          הורדת קורות החיים
        </h2>
        <p className="mt-2 text-[16px] text-ink/75">
          עלות ההורדה: <strong className="text-navy">₪{price}</strong>
        </p>
        <p className="mt-1 text-[14px] text-ink/60">
          תשלום חד־פעמי שכולל את כל התבניות. התשלום נפתח בעמוד מאובטח — אחרי
          שסיימת, חזרי לכאן להורדה.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
            className="focus-brand inline-flex h-12 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-white hover:bg-primary-600"
          >
            לתשלום מאובטח ↗
          </a>
          <button
            type="button"
            onClick={onPaid}
            disabled={!opened}
            className="focus-brand inline-flex h-12 items-center justify-center rounded-full border border-mint text-[15px] font-semibold text-navy hover:bg-mint-100 disabled:opacity-40"
          >
            שילמתי — להורדה
          </button>
          <button
            type="button"
            onClick={onClose}
            className="focus-brand rounded-full px-4 py-2 text-[14px] font-semibold text-ink/60 hover:bg-canvas"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Fieldset({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
      <h2 className="text-[18px] font-bold text-navy">{title}</h2>
      {hint && <p className="mt-1 text-[13.5px] text-ink/60">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  ltr,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ltr?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      dir={ltr && value ? "ltr" : undefined}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
      aria-label={label}
      className={cn(
        "focus-brand h-11 w-full rounded-full border border-ink/20 bg-white px-5 text-[14px] placeholder:text-ink/50",
        className,
      )}
    />
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 3,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
      aria-label={label}
      className={cn(
        "focus-brand w-full resize-y rounded-[18px] border border-ink/20 bg-white px-5 py-3 text-[14px] placeholder:text-ink/50",
        className,
      )}
    />
  );
}
