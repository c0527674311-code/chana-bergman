import { matchCandidates, type ExtractedRequirement } from "@/lib/matching";
import { LOAD_ERROR_MESSAGE, listCandidates } from "@/lib/queries";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import type { MatchEvidence } from "@/lib/types";

/**
 * A one-hour download link to each candidate's current CV. Chana forwards
 * these to employers, so the list without the files was only half an answer.
 */
async function currentCvLinks(candidateIds: string[]): Promise<Map<string, { url: string; name: string }>> {
  const links = new Map<string, { url: string; name: string }>();
  if (!candidateIds.length || !adminConfigured()) return links;
  try {
    const admin = createAdminClient();
    const docs: { candidate_id: string; storage_path: string; file_name: string }[] = [];
    for (let i = 0; i < candidateIds.length; i += 100) {
      const { data } = await admin
        .from("cv_documents")
        .select("candidate_id, storage_path, file_name")
        .in("candidate_id", candidateIds.slice(i, i + 100))
        .eq("is_current", true);
      docs.push(...(data ?? []));
    }
    if (!docs.length) return links;
    const { data: signed } = await admin.storage
      .from("cvs")
      .createSignedUrls(docs.map((d) => d.storage_path), 60 * 60);
    for (const s of signed ?? []) {
      const doc = docs.find((d) => d.storage_path === s.path);
      if (doc && s.signedUrl) {
        links.set(doc.candidate_id, { url: s.signedUrl, name: doc.file_name.split("/").pop() ?? doc.file_name });
      }
    }
  } catch (err) {
    console.error("cv links failed:", err);
  }
  return links;
}

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
  /** Graduate of the DiversiTech practicum, and which cohort. */
  practicum: boolean;
  practicumYear: number | null;
  mailable: boolean;
  unsubscribed: boolean;
  score: number;
  reason: string;
  matched: string[];
  missing: string[];
  /** Where each match came from — a field, or a quote from the CV. */
  evidence: MatchEvidence[];
  /** True when the requirement's technology appears in her employment history. */
  experienceMatch: boolean;
  /** Her current CV file: a link that works for an hour, or null when there is no file. */
  cvUrl: string | null;
  cvName: string | null;
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
  // High enough that "select all the matches" really is all of them.
  limit = 300,
): Promise<MatchResponse | { error: string }> {
  const { candidates, failed } = await listCandidates({}, 5000);
  // A failed load used to rank an empty list and report "no candidates match",
  // which reads as an answer to give the employer rather than a fault.
  if (failed) return { error: LOAD_ERROR_MESSAGE };

  const { requirement, results, relevantCount, fallback, lookup } = matchCandidates(candidates, text, limit);
  const cvs = await currentCvLinks(results.map((r) => r.candidate.id));
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
      practicum: Boolean(r.candidate.diversitech_practicum),
      practicumYear: r.candidate.diversitech_year ?? null,
      mailable: Boolean(r.candidate.email && r.candidate.consent_marketing && !r.candidate.unsubscribed_at),
      unsubscribed: Boolean(r.candidate.unsubscribed_at),
      score: r.score,
      reason: r.reason,
      matched: r.matchedTechnologies,
      missing: r.missingTechnologies,
      evidence: r.evidence,
      experienceMatch: r.experienceMatch,
      cvUrl: cvs.get(r.candidate.id)?.url ?? null,
      cvName: cvs.get(r.candidate.id)?.name ?? null,
    })),
  };
}
