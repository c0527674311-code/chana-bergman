import type { Metadata } from "next";
import { MatchWorkbench } from "@/components/admin/MatchWorkbench";
import { runMatch, type MatchResponse } from "@/lib/match-response";
import { LOAD_ERROR_MESSAGE } from "@/lib/queries";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "איתור לפי דרישה" };

type RequirementRow = {
  title: string;
  raw_text: string | null;
  required_technologies: string[] | null;
  required_languages: string[] | null;
  seniority: string | null;
  region: string | null;
};

type LoadedRequirement = {
  title: string | null;
  text: string;
  result: MatchResponse | null;
  error: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A requirement opened from the requirements list (`?requirement=<id>`).
 * The link always pointed here, but the page ignored it and showed an empty
 * box — so the saved requirement is loaded and ranked straight away.
 */
async function loadRequirement(id: string): Promise<LoadedRequirement> {
  const notFound: LoadedRequirement = {
    title: null,
    text: "",
    result: null,
    error: "הדרישה לא נמצאה — ייתכן שנמחקה.",
  };
  if (!supabaseConfigured || !UUID.test(id)) return notFound;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requirements")
    .select("title, raw_text, required_technologies, required_languages, seniority, region")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("requirement load failed:", error);
    return { ...notFound, error: LOAD_ERROR_MESSAGE };
  }
  const req = data as RequirementRow | null;
  if (!req) return notFound;

  // The employer's original wording when it was kept; otherwise the structured
  // fields, written out so the extractor reads them back the same way.
  const text =
    req.raw_text?.trim() ||
    [
      req.title,
      [...(req.required_languages ?? []), ...(req.required_technologies ?? [])].join(", "),
      req.seniority,
      req.region && `אזור ${req.region}`,
    ]
      .filter(Boolean)
      .join("\n");

  const outcome = await runMatch(text);
  return "error" in outcome
    ? { title: req.title, text, result: null, error: outcome.error }
    : { title: req.title, text, result: outcome, error: null };
}

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { requirement } = await searchParams;
  const requirementId = typeof requirement === "string" && requirement ? requirement : null;
  const loaded = requirementId ? await loadRequirement(requirementId) : null;

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">איתור מיידי לפי דרישה</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          הדביקי את טקסט הדרישה בדיוק כפי שהמעסיק שלח. המערכת תזהה את הטכנולוגיות, רמת
          הבכירות והאזור, ותדרג את כל המאגר מולם.
        </p>
        {loaded?.title && (
          <p className="mt-3 text-[15px] font-semibold text-navy">דרישה: {loaded.title}</p>
        )}
      </header>
      {/* Keyed so opening another requirement starts from a fresh workbench. */}
      <MatchWorkbench
        key={requirementId ?? "new"}
        initialText={loaded?.text}
        initialResult={loaded?.result}
        initialError={loaded?.error}
      />
    </>
  );
}
