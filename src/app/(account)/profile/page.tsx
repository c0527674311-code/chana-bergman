import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Section } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { createClient, getCurrentUser, supabaseConfigured } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Candidate, CvDocument } from "@/lib/types";

export const metadata: Metadata = {
  title: "הפרופיל שלי",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  if (!supabaseConfigured) redirect("/profile/edit");

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Candidate>();

  const { data: cvs } = candidate
    ? await supabase
        .from("cv_documents")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("version", { ascending: false })
        .returns<CvDocument[]>()
    : { data: null };

  const currentCv = cvs?.find((c) => c.is_current) ?? null;

  return (
    <>
      <Header user={{ firstName: candidate?.first_name ?? user.firstName, isAdmin: user.isAdmin }} />
      <main>
        <Section>
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[32px] font-extrabold text-navy">
                  הי, {candidate?.first_name ?? user.firstName ?? "משתמשת"}
                </h1>
                <p className="mt-1 text-[16px] text-ink/70">
                  זה מה שחנה רואה עלייך במאגר. כדאי לעדכן כשמשהו משתנה.
                </p>
              </div>
              <ButtonLink href="/profile/edit" size="md">
                עריכת פרטים
              </ButtonLink>
            </div>

            {!candidate ? (
              <div className="mt-10 rounded-[var(--radius-card)] bg-canvas p-10 text-center">
                <p className="text-[17px] font-semibold text-navy">עוד לא מילאת פרופיל</p>
                <p className="mx-auto mt-2 max-w-md text-[15px] text-ink/70">
                  שווה להשקיע שתי דקות — ככה נדע להתאים לך משרות רלוונטיות.
                </p>
                <ButtonLink href="/profile/edit" className="mt-6">
                  למילוי הפרופיל
                </ButtonLink>
              </div>
            ) : (
              <dl className="mt-10 grid gap-x-8 gap-y-6 rounded-[var(--radius-card)] bg-canvas p-8 sm:grid-cols-2">
                <Row label="שם מלא" value={[candidate.first_name, candidate.last_name].filter(Boolean).join(" ")} />
                <Row label="מייל" value={candidate.email} ltr />
                <Row label="טלפון" value={candidate.phone} ltr />
                <Row label="גרה ב" value={candidate.city} />
                <Row label="מחפשת עבודה באזור" value={candidate.preferred_regions?.join(" · ")} />
                <Row label="שנות ניסיון" value={candidate.experience_years} />
                <Row label="שפות תכנות" value={candidate.programming_languages?.join(", ")} />
                <Row label="טכנולוגיות" value={candidate.technologies?.join(", ")} />
                <Row label="שפות" value={candidate.spoken_languages?.join(", ")} />
                <Row
                  label="לפנות אליי לפני שליחת קו״ח"
                  value={candidate.contact_before_sending ? "כן" : "לא"}
                />
                {candidate.notes_from_candidate && (
                  <div className="sm:col-span-2">
                    <dt className="text-[13px] font-semibold text-ink/55">הערות</dt>
                    <dd className="mt-1 whitespace-pre-line text-[16px] text-ink">
                      {candidate.notes_from_candidate}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <div className="mt-8 rounded-[var(--radius-card)] border border-ink/10 p-8">
              <h2 className="text-[20px] font-bold text-navy">קורות החיים שלי</h2>
              {currentCv ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[16px] font-semibold text-ink">{currentCv.file_name}</p>
                    <p className="text-[14px] text-ink/60">
                      גרסה {currentCv.version} · הועלה ב-{formatDate(currentCv.created_at)}
                    </p>
                  </div>
                  <ButtonLink href="/profile/edit" variant="outline" size="sm">
                    העלאת גרסה חדשה
                  </ButtonLink>
                </div>
              ) : (
                <p className="mt-3 text-[15px] text-ink/70">
                  עוד לא העלית קובץ.{" "}
                  <Link href="/profile/edit" className="font-semibold text-primary hover:underline">
                    להעלאה
                  </Link>
                </p>
              )}
              {cvs && cvs.length > 1 && (
                <details className="mt-5">
                  <summary className="focus-brand cursor-pointer rounded text-[14px] font-semibold text-primary">
                    גרסאות קודמות ({cvs.length - 1})
                  </summary>
                  <ul className="mt-3 flex flex-col gap-2">
                    {cvs
                      .filter((c) => !c.is_current)
                      .map((c) => (
                        <li key={c.id} className="text-[14px] text-ink/70">
                          גרסה {c.version} · {c.file_name} · {formatDate(c.created_at)}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-[13px] font-semibold text-ink/55">{label}</dt>
      <dd className="mt-1 text-[16px] text-ink" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}
