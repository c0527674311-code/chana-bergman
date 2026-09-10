import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";

/** Site-wide 404 — unmatched URLs and every notFound() call. */
export default function NotFound() {
  return (
    <PageShell
      kicker="Page not found"
      title="הדף שחיפשת לא נמצא"
      lead="ייתכן שהקישור ישן, או שהמשרה כבר אוישה. אפשר להמשיך מכאן:"
    >
      <Section className="pt-6 lg:pt-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            לדף הבית
          </ButtonLink>
          <ButtonLink href="/jobs" variant="outline" size="lg">
            משרות פתוחות
          </ButtonLink>
          <ButtonLink href="/submit-cv" variant="outline" size="lg">
            שליחת קורות חיים
          </ButtonLink>
        </div>
      </Section>
    </PageShell>
  );
}
