import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { Markdown } from "@/components/site/Markdown";
import { CONTACT_DETAILS } from "@/lib/content/site";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  robots: { index: true, follow: false },
  alternates: { canonical: "/accessibility" },
};

const STATEMENT = `אנחנו רואות בנגישות האתר חלק מהשירות, ולא תוספת. האתר נבנה בהתאם לתקן הישראלי ת"י 5568 ברמה AA, המבוסס על הנחיות WCAG 2.1.

## מה נעשה

- ניווט מלא באמצעות מקלדת בכל עמודי האתר
- תמיכה בקוראי מסך, כולל תיאורים לכל הכפתורים והשדות
- ניגודיות צבעים העומדת בדרישות התקן
- טפסים עם תוויות מקושרות והודעות שגיאה ברורות
- כיבוד העדפת המשתמש להפחתת אנימציות
- מבנה כותרות היררכי ותקין בכל עמוד

## מגבלות ידועות

קבצי קורות חיים שהועלו על ידי משתמשות הם תוכן חיצוני, ואיננו יכולות להבטיח את נגישותם.

## נתקלת בבעיה?

אם נתקלת בקושי בשימוש באתר, נשמח לשמוע ולתקן. אפשר לפנות אלינו במייל ${CONTACT_DETAILS.email}. נשתדל לטפל בכל פנייה תוך מספר ימי עסקים.`;

export default async function AccessibilityPage() {
  const user = await getCurrentUser();
  return (
    <PageShell user={user} title="הצהרת נגישות">
      <Section>
        <div className="mx-auto max-w-2xl">
          <Markdown source={STATEMENT} />
        </div>
      </Section>
    </PageShell>
  );
}
