import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { CvBuilder } from "@/components/cv/CvBuilder";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "בונה קורות חיים",
  description:
    "ממלאים פרטים, בוחרים תבנית מעוצבת, ומורידים קורות חיים מקצועיים כ-PDF — בפורמט שמערכות הסינון של חברות ההייטק יודעות לקרוא.",
};

export default async function CvBuilderPage() {
  const user = await getCurrentUser();
  return (
    <PageShell
      user={user}
      kicker="CV Builder"
      title="בונה קורות החיים"
      lead="ממלאים פרטים, בוחרים תבנית, ומורידים PDF מעוצב. כל התבניות בנויות כך שמערכות הסינון האוטומטיות של חברות ההייטק קוראות אותן בלי בעיה."
    >
      <Section className="pt-10 lg:pt-12">
        <CvBuilder />
      </Section>
    </PageShell>
  );
}
