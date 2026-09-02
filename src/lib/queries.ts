import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { DEMO_CANDIDATES } from "@/lib/demo-data";
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
};

/** True when the app is running on sample data rather than a real database. */
export const isDemoMode = !supabaseConfigured;

/**
 * Loads candidates for the back-office. Falls back to the sample set so the
 * admin can be reviewed before the import runs.
 */
export async function listCandidates(
  filters: CandidateFilters = {},
  limit = 500,
): Promise<Candidate[]> {
  if (!supabaseConfigured) return filterInMemory(DEMO_CANDIDATES, filters).slice(0, limit);

  const supabase = await createClient();
  let query = supabase.from("candidates").select("*").is("deleted_at", null);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.seniority) query = query.eq("seniority", filters.seniority);
  if (filters.region) query = query.overlaps("preferred_regions", [filters.region]);
  if (filters.experience) query = query.eq("experience_years", filters.experience);
  if (filters.institution) query = query.eq("institution", filters.institution);
  if (filters.cohort) query = query.eq("cohort_year", Number(filters.cohort));
  if (filters.technology) query = query.contains("technologies", [filters.technology]);
  if (filters.language) query = query.contains("programming_languages", [filters.language]);
  if (filters.q) query = query.ilike("search_text", `%${filters.q.toLowerCase()}%`);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(limit)
    .returns<Candidate[]>();

  if (error) {
    console.error("listCandidates failed:", error);
    return [];
  }
  return data ?? [];
}

function filterInMemory(rows: Candidate[], f: CandidateFilters): Candidate[] {
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.seniority && r.seniority !== f.seniority) return false;
    if (f.region && !(r.preferred_regions ?? []).includes(f.region)) return false;
    if (f.experience && r.experience_years !== f.experience) return false;
    if (f.institution && r.institution !== f.institution) return false;
    if (f.cohort && String(r.cohort_year) !== f.cohort) return false;
    if (f.technology && !r.technologies.includes(f.technology)) return false;
    if (f.language && !r.programming_languages.includes(f.language)) return false;
    if (f.q) {
      const blob = [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        r.city,
        r.institution,
        ...r.technologies,
        ...r.programming_languages,
        r.notes_from_candidate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!blob.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
}

export async function candidateStats() {
  const rows = await listCandidates({}, 5000);
  const now = Date.now();
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    placed: rows.filter((r) => r.status === "placed").length,
    mailable: rows.filter((r) => r.email && r.consent_marketing && !r.unsubscribed_at).length,
    addedLast30: rows.filter((r) => now - new Date(r.created_at).getTime() < 30 * 864e5).length,
    cohorts: [...new Set(rows.map((r) => r.cohort_year).filter(Boolean))].sort((a, b) => b! - a!),
  };
}
