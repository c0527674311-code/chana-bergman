import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/queries";
import { matchCandidates } from "@/lib/matching";
import { requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { text, limit } = (await request.json().catch(() => ({}))) as {
    text?: string;
    limit?: number;
  };

  if (!text || text.trim().length < 3) {
    return NextResponse.json({ error: "נא להדביק את טקסט הדרישה." }, { status: 400 });
  }

  const candidates = await listCandidates({}, 5000);
  const { requirement, results } = matchCandidates(candidates, text, limit ?? 60);

  return NextResponse.json({
    requirement,
    total: candidates.length,
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
      score: r.score,
      reason: r.reason,
      matched: r.matchedTechnologies,
      missing: r.missingTechnologies,
    })),
  });
}
