import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { DEMO_CANDIDATES } from "@/lib/demo-data";
import { phoneSearchDigits } from "@/lib/search-query";
import type { Candidate } from "@/lib/types";

export type CandidateFilters = {
  q?: string;
  technology?: string;
  language?: string;
  seniority?: string;
  region?: string;
  experience?: string;
  institution?: string;
  cohort?: string;
  status?: string;
  /** "yes" — only DiversiTech practicum graduates. */
  practicum?: string;
};

/** True when the app is running on sample data rather than a real database. */
export const isDemoMode = !supabaseConfigured;

export const LOAD_ERROR_MESSAGE = "הייתה תקלה בטעינת הנתונים — נסי לרענן.";

/**
 * `failed` is set when the query errored. It has to travel with the rows:
 * returning a bare [] made a database fault look exactly like "no candidates".
 */
export type CandidateList = { candidates: Candidate[]; failed: boolean };

/**
 * Loads candidates for the back-office. Falls back to the sample set so the
 * admin can be reviewed before the import runs.
 */
export async function listCandidates(
  filters: CandidateFilters = {},
  limit = 2000,
): Promise<CandidateList> {
  if (!supabaseConfigured) {
    return { candidates: filterInMemory(DEMO_CANDIDATES, filters).slice(0, limit), failed: false };
  }

  const supabase = await createClient();
  // PostgREST caps a single response (1000 rows by default), so more than that
  // is read page by page — otherwise the pool silently stops growing at 1000.
  const PAGE = 1000;
  const all: Candidate[] = [];

  for (let from = 0; from < limit; from += PAGE) {
    const { rows, failed } = await fetchPage(supabase, filters, from, Math.min(from + PAGE, limit) - 1);
    if (failed) return { candidates: [], failed: true };
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { candidates: all, failed: false };
}

async function fetchPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: CandidateFilters,
  from: number,
  to: number,
): Promise<{ rows: Candidate[]; failed: boolean }> {
  let query = supabase.from("candidates").select("*").is("deleted_at", null);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.seniority) query = query.eq("seniority", filters.seniority);
  if (filters.region) query = query.overlaps("preferred_regions", [filters.region]);
  if (filters.experience) query = query.eq("experience_years", filters.experience);
  if (filters.institution) query = query.eq("institution", filters.institution);
  if (filters.cohort) query = query.eq("cohort_year", Number(filters.cohort));
  if (filters.practicum === "yes") query = query.eq("diversitech_practicum", true);
  if (filters.technology) query = query.contains("technologies", [filters.technology]);
  if (filters.language) query = query.contains("programming_languages", [filters.language]);
  if (filters.q) {
    const needle = phoneSearchDigits(filters.q) ?? filters.q.toLowerCase();
    query = query.ilike("search_text", `%${needle}%`);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .range(from, to)
    .returns<Candidate[]>();

  if (error) {
    console.error("listCandidates failed:", error);
    return { rows: [], failed: true };
  }
  return { rows: data ?? [], failed: false };
}

function filterInMemory(rows: Candidate[], f: CandidateFilters): Candidate[] {
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.seniority && r.seniority !== f.seniority) return false;
    if (f.region && !(r.preferred_regions ?? []).includes(f.region)) return false;
    if (f.experience && r.experience_years !== f.experience) return false;
    if (f.institution && r.institution !== f.institution) return false;
    if (f.cohort && String(r.cohort_year) !== f.cohort) return false;
    if (f.practicum === "yes" && !r.diversitech_practicum) return false;
    if (f.technology && !r.technologies.includes(f.technology)) return false;
    if (f.language && !r.programming_languages.includes(f.language)) return false;
    if (f.q) {
      const blob = [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        r.phone?.replace(/\D/g, ""),
        r.city,
        r.institution,
        ...r.technologies,
        ...r.programming_languages,
        r.notes_from_candidate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!blob.includes(phoneSearchDigits(f.q) ?? f.q.toLowerCase())) return false;
    }
    return true;
  });
}

export async function candidateStats() {
  const { candidates: rows, failed } = await listCandidates({}, 5000);
  const now = Date.now();
  return {
    failed,
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    placed: rows.filter((r) => r.status === "placed").length,
    mailable: rows.filter((r) => r.email && r.consent_marketing && !r.unsubscribed_at).length,
    // Registrations through the site only. An import stamps created_at with the
    // day it ran, so counting every new row reported 60 CVs from the disk as 60
    // new sign-ups.
    signedUpLast30: rows.filter(
      (r) => r.source === "site" && now - new Date(r.created_at).getTime() < 30 * 864e5,
    ).length,
    cohorts: [...new Set(rows.map((r) => r.cohort_year).filter(Boolean))].sort((a, b) => b! - a!),
  };
}
