"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  CANDIDATE_STATUS,
  EXPERIENCE_YEARS,
  INSTITUTIONS,
  PROGRAMMING_LANGUAGES,
  REGIONS,
  SENIORITY,
  TECHNOLOGIES,
  cohortYears,
} from "@/lib/data/options";
import type { CandidateFilters as Filters } from "@/lib/queries";

const SELECTS: Array<{ key: keyof Filters; label: string; options: readonly (string | { value: string; label: string })[] }> = [
  { key: "language", label: "שפת תכנות", options: PROGRAMMING_LANGUAGES },
  { key: "technology", label: "טכנולוגיה", options: TECHNOLOGIES },
  { key: "experience", label: "שנות ניסיון", options: EXPERIENCE_YEARS },
  { key: "seniority", label: "בכירות", options: SENIORITY },
  { key: "region", label: "אזור", options: REGIONS },
  { key: "institution", label: "מוסד", options: INSTITUTIONS },
  { key: "cohort", label: "שנתון", options: cohortYears().map(String) },
  { key: "status", label: "סטטוס", options: CANDIDATE_STATUS.map((s) => ({ value: s.value, label: s.label })) },
  {
    key: "practicum",
    label: "פרקטיקום DiversiTech",
    options: [{ value: "yes", label: "בוגרות הפרקטיקום בלבד" }],
  },
];

export function CandidateFilters({ current }: { current: Filters }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/candidates?${next.toString()}`);
  }

  const activeCount = Object.values(current).filter(Boolean).length;

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
      <div className="flex flex-col gap-3">
        <label htmlFor="q" className="sr-only">
          חיפוש חופשי
        </label>
        <input
          id="q"
          type="search"
          defaultValue={current.q ?? ""}
          placeholder="חיפוש חופשי — שם, מייל, טלפון, טכנולוגיה, או כל טקסט מקורות החיים…"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          className="focus-brand h-12 w-full rounded-full border border-ink/20 px-6 text-[15px]"
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SELECTS.map((s) => (
            <div key={s.key}>
              <label htmlFor={`f-${s.key}`} className="sr-only">
                {s.label}
              </label>
              <select
                id={`f-${s.key}`}
                value={(current[s.key] as string) ?? ""}
                onChange={(e) => update(s.key, e.target.value)}
                className="field-select focus-brand h-11 w-full rounded-full border border-ink/20 bg-white ps-5 pe-11 text-[14px]"
              >
                <option value="">{s.label} — הכל</option>
                {s.options.map((o) => {
                  const v = typeof o === "string" ? o : o.value;
                  const l = typeof o === "string" ? o : o.label;
                  return (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => router.push("/admin/candidates")}
            className="focus-brand self-start rounded-full px-4 py-2 text-[14px] font-semibold text-primary hover:bg-primary-50"
          >
            ניקוי כל הסינונים ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
