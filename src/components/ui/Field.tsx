"use client";

import { useId } from "react";
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
