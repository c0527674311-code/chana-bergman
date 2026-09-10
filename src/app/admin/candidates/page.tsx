import type { Metadata } from "next";
import { CandidateFilters } from "@/components/admin/CandidateFilters";
import { CandidateTable } from "@/components/admin/CandidateTable";
import { listCandidates, type CandidateFilters as Filters } from "@/lib/queries";

export const metadata: Metadata = { title: "מאגר המועמדות" };

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: Filters = {
    q: params.q,
    technology: params.technology,
    language: params.language,
    seniority: params.seniority,
    region: params.region,
    experience: params.experience,
    institution: params.institution,
    cohort: params.cohort,
    status: params.status,
  };

  const candidates = await listCandidates(filters);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[30px] font-extrabold text-navy">מאגר המועמדות</h1>
        <p className="mt-2 text-[16px] text-ink/70">
            נמצאו <strong className="text-navy">{candidates.length}</strong> מועמדות
        </p>
      </header>

      <CandidateFilters current={filters} />
      <div className="mt-6">
        <CandidateTable
          candidates={candidates.map((c) => ({
            id: c.id,
            name: [c.first_name, c.last_name].filter(Boolean).join(" "),
            email: c.email,
            phone: c.phone,
            city: c.city,
            region: c.preferred_regions?.join(" · ") ?? null,
            experience: c.experience_years,
            seniority: c.seniority,
            institution: c.institution,
            cohort: c.cohort_year,
            stack: [...c.programming_languages, ...c.technologies],
            status: c.status,
            updatedAt: c.updated_at,
            mailable: Boolean(c.email && c.consent_marketing && !c.unsubscribed_at),
            unsubscribed: Boolean(c.unsubscribed_at),
          }))}
        />
      </div>
    </>
  );
}
