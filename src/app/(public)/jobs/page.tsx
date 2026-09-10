import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { jobPath, loadPublicJobs } from "@/lib/content/jobs";

export const metadata: Metadata = {
  title: "משרות פתוחות",
  description: "משרות הייטק פתוחות למתכנתות — פיתוח, QA, DevOps, Data וראשות צוות.",
  alternates: { canonical: "/jobs" },
};

export const revalidate = 300;

export default async function JobsPage() {
  const [user, jobs] = await Promise.all([getCurrentUser(), loadPublicJobs()]);

  return (
    <PageShell
      user={user}
      kicker="Open Positions"
      title="משרות פתוחות"
      lead="חלק קטן מהמשרות שאנחנו מאיישות מתפרסם כאן. הרוב מגיע ישירות למי שמתאימה במאגר."
    >
      <Section>
        {jobs.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] bg-canvas p-12 text-center">
            <p className="text-[19px] font-bold text-navy">כרגע אין משרות פתוחות באתר</p>
            <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-ink/75">
              הצטרפי למאגר ונעדכן אותך כשתגיע משרה שמתאימה לך. רוב הדרישות שלנו לא מתפרסמות
              בכלל — הן נשלחות ישירות למועמדות מהמאגר.
            </p>
            <ButtonLink href="/submit-cv" className="mt-7" size="lg">
              הצטרפות למאגר
            </ButtonLink>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-4xl flex-col gap-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={jobPath(job)}
                  className="focus-brand group flex flex-col gap-3 rounded-[var(--radius-card)] bg-white p-7 shadow-[0_10px_40px_-28px_rgb(28_28_60_/_0.4)] transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <h2 className="text-[21px] font-bold text-navy group-hover:text-primary">
                    {job.title}
                  </h2>
                  {job.public_description && (
                    <p className="line-clamp-2 text-[16px] leading-relaxed text-ink/70">
                      {job.public_description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {job.seniority && <Tag>{job.seniority}</Tag>}
                    {job.region && <Tag>{job.region}</Tag>}
                    {job.job_scope?.map((s) => <Tag key={s}>{s}</Tag>)}
                    {job.required_technologies?.slice(0, 5).map((t) => (
                      <Tag key={t} mint>
                        {t}
                      </Tag>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageShell>
  );
}

function Tag({ children, mint }: { children: React.ReactNode; mint?: boolean }) {
  return (
    <span
      className={
        "rounded-full px-3 py-1 text-[13px] font-medium " +
        (mint ? "bg-mint-100 text-navy" : "bg-canvas text-ink/70")
      }
    >
      {children}
    </span>
  );
}
