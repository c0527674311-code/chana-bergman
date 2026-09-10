import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { jobPath, loadPublicJob } from "@/lib/content/jobs";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await loadPublicJob(slug);
  if (!job) return { title: "המשרה לא נמצאה" };
  const description = job.public_description?.replace(/\s+/g, " ").trim().slice(0, 200);
  return {
    title: job.title,
    description: description || undefined,
    alternates: { canonical: jobPath(job) },
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, job] = await Promise.all([getCurrentUser(), loadPublicJob(slug)]);
  if (!job) notFound();

  return (
    <PageShell user={user} title={job.title}>
      <Section>
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap gap-2">
            {job.seniority && <Tag>{job.seniority}</Tag>}
            {job.region && <Tag>{job.region}</Tag>}
            {job.job_scope?.map((s) => <Tag key={s}>{s}</Tag>)}
          </div>

          {job.public_description && (
            <div className="mt-8 whitespace-pre-line text-[17px] leading-[1.85] text-ink/80">
              {job.public_description}
            </div>
          )}

          {job.required_technologies?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-[18px] font-bold text-navy">טכנולוגיות</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {job.required_technologies.map((t) => (
                  <li key={t} className="rounded-full bg-mint-100 px-3.5 py-1.5 text-[14px] font-medium text-navy">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-12 rounded-[var(--radius-card)] bg-canvas p-8 text-center">
            <h2 className="text-[20px] font-bold text-navy">מתאים לך?</h2>
            <p className="mx-auto mt-2 max-w-md text-[16px] text-ink/75">
              שלחי קורות חיים ונחזור אלייך. אם כבר במאגר — מספיק להזכיר את שם המשרה במייל.
            </p>
            <ButtonLink href="/submit-cv" className="mt-6">
              הגשת מועמדות
            </ButtonLink>
          </div>

          <p className="mt-10 text-center">
            <Link href="/jobs" className="focus-brand rounded text-[15px] font-semibold text-primary hover:underline">
              ← לכל המשרות
            </Link>
          </p>
        </div>
      </Section>
    </PageShell>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-canvas px-3 py-1 text-[13px] font-medium text-ink/70">{children}</span>;
}
