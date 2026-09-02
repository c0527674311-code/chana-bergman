"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The design puts the field name inside the control as placeholder text.
 * We keep a real (visually hidden) <label> so the form stays accessible and
 * screen readers announce the field, while the visual matches the mockup.
 */

const fieldBase =
  "focus-brand h-[52px] w-full rounded-full border border-ink/20 bg-white px-6 text-[15px] text-ink placeholder:text-ink/70 transition-colors hover:border-ink/35 disabled:bg-canvas disabled:text-ink/50";

function ErrorText({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="ps-6 pt-1.5 text-[13px] font-medium text-red-600">
      {children}
    </p>
  );
}

type CommonProps = { label: string; error?: string; hint?: string; className?: string };

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: CommonProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        placeholder={label}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(fieldBase, error && "border-red-400")}
        {...props}
      />
      {hint && !error && <p className="ps-6 pt-1.5 text-[13px] text-ink/60">{hint}</p>}
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}: CommonProps & {
  options: readonly string[] | readonly { value: string; label: string }[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const errId = `${id}-err`;
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
        defaultValue=""
        className={cn(fieldBase, "field-select ps-6 pe-12", error && "border-red-400")}
        {...props}
      >
        <option value="" disabled>
          {placeholder ?? label}
        </option>
        {norm.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

/**
 * Multi-value picker styled like Select: a pill button that opens a checkbox
 * panel. Selected values are submitted as repeated hidden inputs, so
 * FormData.getAll(name) on the server sees a plain string array.
 */
export function MultiSelect({
  label,
  name,
  options,
  defaultValue = [],
  error,
  className,
}: CommonProps & {
  name: string;
  options: readonly string[];
  defaultValue?: readonly string[];
}) {
  const id = useId();
  const errId = `${id}-err`;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() =>
    defaultValue.filter((v) => options.includes(v)),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function toggle(value: string) {
    setSelected((cur) =>
      cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(
          fieldBase,
          "flex items-center justify-between gap-3 text-start",
          error && "border-red-400",
        )}
      >
        <span className={cn("truncate", selected.length === 0 && "text-ink/70")}>
          {selected.length === 0 ? label : selected.join(", ")}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {selected.length > 1 && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[12px] font-bold text-primary">
              {selected.length}
            </span>
          )}
          <svg
            viewBox="0 0 14 8"
            fill="none"
            className={cn("h-2 w-3 text-ink/60 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          >
            <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      {open && (
        <div
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-[22px] bg-white p-2 shadow-[var(--shadow-pop)] ring-1 ring-ink/10"
        >
          {options.map((o) => {
            const checked = selected.includes(o);
            return (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-2 text-[15px] text-ink hover:bg-primary-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o)}
                  className="focus-brand h-4 w-4 shrink-0 rounded accent-[var(--color-primary)]"
                />
                <span>{o}</span>
              </label>
            );
          })}
        </div>
      )}
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

export function Textarea({
  label,
  error,
  rows = 4,
  className,
  ...props
}: CommonProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        placeholder={label}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(
          "focus-brand w-full resize-y rounded-[26px] border border-ink/20 bg-white px-6 py-4 text-[15px] text-ink placeholder:text-ink/70 transition-colors hover:border-ink/35",
          error && "border-red-400",
        )}
        {...props}
      />
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

/** Yes/No style radio row — matches the "אנא סמני" block in the profile design. */
export function RadioRow({
  legend,
  name,
  options,
  defaultValue,
  className,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="pb-2 text-[15px] font-bold text-ink">{legend}</legend>
      <div className="flex items-center gap-6">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              className="focus-brand h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: { label: React.ReactNode; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="focus-brand mt-1 h-4 w-4 shrink-0 rounded accent-[var(--color-primary)]"
        {...props}
      />
      <label htmlFor={id} className="text-[14px] leading-relaxed text-ink/80">
        {label}
      </label>
    </div>
  );
}
