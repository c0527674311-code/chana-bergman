"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_ACCEPT =
  ".pdf,.doc,.docx,.rtf,.txt,.odt,.pages,.png,.jpg,.jpeg,.heic,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

const MAX_MB = 15;

/**
 * CV upload control. This is the feature that is broken on the current site,
 * so it deliberately accepts anything a candidate is likely to have — PDF,
 * Word, plain text, or a photo of a printed CV taken on a phone — and it
 * validates and reports failures out loud instead of silently doing nothing.
 */
export function FileDrop({
  name = "cv",
  label = "לחצי כאן להעלאת הקובץ",
  accept = DEFAULT_ACCEPT,
  required = false,
  onFileChange,
  className,
}: {
  name?: string;
  label?: string;
  accept?: string;
  required?: boolean;
  onFileChange?: (file: File | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept_(f: File | null) {
    if (!f) {
      setFile(null);
      setError(null);
      onFileChange?.(null);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`הקובץ גדול מדי (${(f.size / 1024 / 1024).toFixed(1)}MB). הגודל המרבי הוא ${MAX_MB}MB.`);
      setFile(null);
      onFileChange?.(null);
      return;
    }
    setError(null);
    setFile(f);
    onFileChange?.(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      inputRef.current.files = dt.files;
    }
    accept_(f);
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-[26px] border-2 border-dashed p-5 transition-colors",
          dragging ? "border-primary bg-primary-50" : "border-ink/20 bg-white hover:border-primary/50",
          error && "border-red-400",
        )}
      >
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept={accept}
          required={required}
          className="sr-only"
          onChange={(e) => accept_(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint-100 text-navy">
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path
                    d="M4 3.5h7L16 8v8.5H4z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M11 3.5V8h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">{file.name}</p>
                <p className="text-[13px] text-ink/60">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                accept_(null);
              }}
              className="focus-brand shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary-50"
            >
              החלפה
            </button>
          </div>
        ) : (
          <label
            htmlFor={name}
            className="flex cursor-pointer flex-col items-center gap-1.5 py-3 text-center"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-mint text-navy">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path
                  d="M10 14V4m0 0L6 8m4-4 4 4M3.5 14.5v1A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5v-1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[15px] font-bold text-primary">{label} &gt;</span>
            <span className="text-[13px] text-ink/60">
              PDF, Word, או צילום מהנייד · עד {MAX_MB}MB
            </span>
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="ps-6 pt-1.5 text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
