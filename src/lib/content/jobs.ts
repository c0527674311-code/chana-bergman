import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { JobPosting } from "@/lib/types";

/**
 * The public job board: real requirements Chana marked "ציבורית" that are
 * still open. There is deliberately no sample fallback — the made-up postings
 * that used to fill an empty board were removed, and an empty board shows an
 * empty state instead.
 *
 * Both loaders swallow database errors (logged) so a hiccup renders an empty
 * board or a 404, never a crashed page or sitemap.
 */

const JOB_COLUMNS =
  "id, title, public_slug, public_description, required_technologies, seniority, region, job_scope, created_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function jobPath(job: Pick<JobPosting, "id" | "public_slug">): string {
  return `/jobs/${job.public_slug ?? job.id}`;
}

export const loadPublicJobs = cache(async (): Promise<JobPosting[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("requirements")
    .select(JOB_COLUMNS)
    .eq("is_public", true)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .returns<JobPosting[]>();
  if (error) {
    console.error("public jobs load failed:", error.message);
    return [];
  }
  return data ?? [];
});

/** A job by its public slug or, for links without one, by its id. */
export const loadPublicJob = cache(async (slug: string): Promise<JobPosting | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const openJobs = () =>
    supabase.from("requirements").select(JOB_COLUMNS).eq("is_public", true).eq("status", "open");

  // requirements.id is a uuid, and comparing it to a non-uuid string is a
  // Postgres error that failed the whole lookup — so only try the id for
  // UUID-shaped values. .eq() also escapes the value; the old string-built
  // .or() filter could be broken by a comma or parenthesis in the URL.
  if (UUID_RE.test(slug)) {
    const { data, error } = await openJobs().eq("id", slug).maybeSingle<JobPosting>();
    if (error) console.error("public job load failed:", error.message);
    if (data) return data;
  }

  const { data, error } = await openJobs().eq("public_slug", slug).maybeSingle<JobPosting>();
  if (error) console.error("public job load failed:", error.message);
  return data ?? null;
});
