"use client";

import { Input, MultiSelect, RadioRow, Select, Textarea } from "@/components/ui/Field";
import {
  CITIES,
  EXPERIENCE_YEARS,
  PROGRAMMING_LANGUAGES,
  REGIONS,
  SPOKEN_LANGUAGES,
  TECHNOLOGIES,
} from "@/lib/data/options";
import type { Candidate } from "@/lib/types";

/**
 * The candidate detail block, shared by the public CV-submission page and the
 * signed-in profile editor. Field order and pairing follow the Figma screen:
 * every row is right column first, left column second.
 *
 * The CV file input deliberately lives OUTSIDE this component (in
 * CandidateForm): after an auto-scan the fields are remounted with the parsed
 * values as new defaults, and remounting must not reset the chosen file.
 */
export function CandidateProfileFields({
  candidate,
}: {
  candidate?: Partial<Candidate> | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="שם פרטי"
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={candidate?.first_name ?? ""}
        />
        <Input
          label="שם משפחה"
          name="last_name"
          autoComplete="family-name"
          defaultValue={candidate?.last_name ?? ""}
        />
        <Input
          label="מייל"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          defaultValue={candidate?.email ?? ""}
        />
        <Input
          label="טלפון"
          name="phone"
          type="tel"
          autoComplete="tel"
          dir="ltr"
          defaultValue={candidate?.phone ?? ""}
        />
        <MultiSelect
          label="דוברת שפה.."
          name="spoken_languages"
          options={SPOKEN_LANGUAGES}
          defaultValue={candidate?.spoken_languages ?? []}
        />
        <MultiSelect
          label="מתמחה בשפת תכנות.."
          name="programming_languages"
          options={PROGRAMMING_LANGUAGES}
          defaultValue={candidate?.programming_languages ?? []}
        />
        <MultiSelect
          label="מתמחה בטכנולוגיית.."
          name="technologies"
          options={TECHNOLOGIES}
          defaultValue={candidate?.technologies ?? []}
        />
        <Select
          label="מס’ שנות ניסיון"
          name="experience_years"
          options={EXPERIENCE_YEARS}
          defaultValue={candidate?.experience_years ?? ""}
        />
        <Select label="גרה ב.." name="city" options={CITIES} defaultValue={candidate?.city ?? ""} />
        <Select
          label="מעוניינת למצוא עבודה באזור"
          name="preferred_region"
          options={REGIONS}
          defaultValue={candidate?.preferred_region ?? ""}
        />
      </div>

      <Textarea
        label="הע/ארות שחשוב לי לומר:"
        name="notes_from_candidate"
        rows={4}
        defaultValue={candidate?.notes_from_candidate ?? ""}
      />

      <RadioRow
        className="pt-2"
        legend={'אנא סמני - מעוניינת שישאלו אותי קודם לפני שליחת קו"ח'}
        name="contact_before_sending"
        options={[
          { value: "yes", label: "כן" },
          { value: "no", label: "לא" },
        ]}
        defaultValue={candidate?.contact_before_sending ? "yes" : "no"}
      />
    </div>
  );
}
