import { matchCandidates, type ExtractedRequirement } from "@/lib/matching";
import { LOAD_ERROR_MESSAGE, listCandidates } from "@/lib/queries";

/** One ranked candidate, as the match screen shows her. */
export type MatchRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  seniority: string | null;
  experience: string | null;
  institution: string | null;
  cohort: number | null;
  status: string;
  mailable: boolean;
  unsubscribed: boolean;
  score: number;
  reason: string;
  matched: string[];
  missing: string[];
};

export type MatchResponse = {
  requirement: ExtractedRequirement;
  /** Candidates in the database. */
  total: number;
  /** How many of them match the requirement (the list may show fewer). */
  relevantCount: number;
  /** True when nobody matched and the nearest few are shown instead. */
  fallback: boolean;
  /** True when the text was a detail (name / phone / ID), not a requirement. */
  lookup: boolean;
  results: MatchRow[];
};

/**
 * Rank the whole database against a requirement text.
 *
 * Shared by the API (a requirement Chana pastes) and the match page (a saved
 * requirement opened from the requirements list), so both rank identically.
 */
export async function runMatch(
  text: string,
  limit = 60,
): Promise<MatchResponse | { error: string }> {
  const { candidates, failed } = await listCandidates({}, 5000);
  // A failed load used to rank an empty list and report "no candidates match",
  // which reads as an answer to give the employer rather than a fault.
  if (failed) return { error: LOAD_ERROR_MESSAGE };

  const { requirement, results, relevantCount, fallback, lookup } = matchCandidates(candidates, text, limit);
  return {
    requirement,
    total: candidates.length,
    relevantCount,
    fallback,
    lookup,
    results: results.map((r) => ({
      id: r.candidate.id,
      name: [r.candidate.first_name, r.candidate.last_name].filter(Boolean).join(" "),
      email: r.candidate.email,
      phone: r.candidate.phone,
      city: r.candidate.city,
      region: r.candidate.preferred_regions?.join(" · ") ?? null,
      seniority: r.candidate.seniority,
      experience: r.candidate.experience_years,
      institution: r.candidate.institution,
      cohort: r.candidate.cohort_year,
      status: r.candidate.status,
      mailable: Boolean(r.candidate.email && r.candidate.consent_marketing && !r.candidate.unsubscribed_at),
      unsubscribed: Boolean(r.candidate.unsubscribed_at),
      score: r.score,
      reason: r.reason,
      matched: r.matchedTechnologies,
      missing: r.missingTechnologies,
    })),
  };
}
