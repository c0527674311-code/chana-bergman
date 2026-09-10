import type { ParsedCv } from "@/lib/cv-parser";
import { classifyFromPath } from "@/lib/folder-classification";
import { normalizeEmail } from "@/lib/utils";

/**
 * Candidate fields from a scanned CV, combined with what the folder it came
 * from says.
 *
 * Chana's folder names are a classification she curated by hand —
 * `מעל 5 שנים/ג'אווה/...` says both the field and the experience band. It is
 * frequently better than the CV: a CV seldom states "5+ years" outright, but
 * she filed it there because she knows. Union it with what the scan found;
 * for experience the folder wins, since that is her own judgement.
 */
export function fieldsFromParsed(parsed: ParsedCv, relativePath: string) {
  const fromFolder = classifyFromPath(relativePath);
  const union = (a: string[] | undefined, b: string[]) => [...new Set([...(a ?? []), ...b])];

  return {
    first_name: parsed.first_name ?? null,
    last_name: parsed.last_name ?? null,
    email: normalizeEmail(parsed.email),
    phone: parsed.phone ?? null,
    city: parsed.city ?? null,
    preferred_regions: parsed.preferred_region ? [parsed.preferred_region] : [],
    programming_languages: union(parsed.programming_languages, fromFolder.programmingLanguages),
    technologies: union(parsed.technologies, fromFolder.technologies),
    spoken_languages: parsed.spoken_languages ?? [],
    role_types: parsed.role_types ?? [],
    experience_years: fromFolder.experienceYears ?? parsed.experience_years ?? null,
    seniority: parsed.seniority ?? null,
    institution: parsed.institution ?? null,
    cohort_year: parsed.cohort_year ?? null,
    notes_internal: parsed.summary ?? null,
    // Keep the folder names verbatim too, so a heading we could not map to the
    // vocabulary is still searchable rather than silently dropped.
    tags: fromFolder.tags,
  };
}

/**
 * The update to apply to an existing candidate.
 *
 * By default it only adds: empty fields are filled and lists gain new items,
 * so nothing Chana curated by hand is overwritten. (Lists used to be written
 * only when empty, so folder tags from a second copy of a CV were lost.)
 * `replace` is for a record nobody has touched since it was imported.
 */
export function mergePatch(
  existing: Record<string, unknown>,
  fields: Record<string, unknown>,
  opts: { replace?: boolean } = {},
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const current = existing[key];

    if (Array.isArray(value)) {
      const base = Array.isArray(current) ? (current as unknown[]) : [];
      const next = opts.replace ? [...new Set(value)] : [...new Set([...base, ...value])];
      const same = next.length === base.length && next.every((v, i) => v === base[i]);
      if (!same) patch[key] = next;
      continue;
    }

    const empty = current == null || current === "";
    if (empty || (opts.replace && current !== value)) patch[key] = value;
  }
  return patch;
}
