import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { Markdown } from "@/components/site/Markdown";
import { BRAND, CONTACT_DETAILS } from "@/lib/content/site";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "תנאי שימוש",
  robots: { index: true, follow: false },
  alternates: { canonical: "/terms" },
};

const TERMS = `## כללי

השימוש באתר ${BRAND.name} כפוף לתנאים המפורטים כאן. שימוש באתר מהווה הסכמה לתנאים אלה.

## השירות

האתר מציע שירותי גיוס והשמה. שליחת קורות חיים אינה מהווה התחייבות מצידנו למצוא משרה, ואינה יוצרת יחסי עבודה או התקשרות מחייבת.

## המידע שאת מוסרת

את מתחייבת שהמידע שאת מוסרת נכון ומעודכן, ושהוא שלך. אין להעלות קורות חיים של אדם אחר בלי הסכמתו.

## שימוש הוגן

אין לעשות שימוש באתר לצורך איסוף מידע על משתמשות אחרות, שליחת ספאם, או כל שימוש הפוגע בפעילותו התקינה.

## קניין רוחני

התכנים, העיצוב והלוגו באתר הם קניינה של ${BRAND.name}. קורות החיים שהעלית נשארים שלך.

## אחריות

האתר מסופק כמות שהוא. אנחנו עושות מאמץ לשמור על זמינות ודיוק, אך איננו אחראיות לנזק שנגרם משימוש באתר או מהסתמכות על תוכנו.

## שינויים

אנחנו רשאיות לעדכן את התנאים. הגרסה המעודכנת תפורסם בעמוד זה.

## יצירת קשר

לשאלות בנוגע לתנאי השימוש: ${CONTACT_DETAILS.email}`;

export default async function TermsPage() {
  const user = await getCurrentUser();
  return (
    <PageShell user={user} title="תנאי שימוש">
      <Section>
        <div className="mx-auto max-w-2xl">
          <Markdown source={TERMS} />
        </div>
      </Section>
    </PageShell>
  );
}
