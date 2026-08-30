import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { Markdown } from "@/components/site/Markdown";
import { BRAND, CONTACT_DETAILS } from "@/lib/content/site";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  robots: { index: true, follow: false },
};

/**
 * Baseline policy covering the Israeli Privacy Protection Law (amendment 13,
 * in force August 2025). Have it reviewed by counsel before launch — the
 * database holds CVs, which are personal data.
 */
const POLICY = `## מה אנחנו אוספים

כשאת שולחת קורות חיים או ממלאת פרופיל באתר, אנחנו שומרות: שם, כתובת מייל, טלפון, עיר מגורים, אזור מועדף, שפות תכנות וטכנולוגיות, שנות ניסיון, מוסד לימודים ושנתון, הערות שכתבת, וקובץ קורות החיים עצמו.

כשמעסיק פונה אלינו, אנחנו שומרות: שם החברה, שם איש הקשר, מייל, טלפון, ומסמך הדרישות אם צורף.

## למה אנחנו משתמשות בזה

- להתאים בין דרישות של מעסיקים לבין מועמדות מתאימות
- ליצור איתך קשר בנוגע למשרות רלוונטיות
- לשלוח עדכונים על משרות, אם אישרת זאת

אנחנו לא מוכרות מידע לצד שלישי ולא משתמשות בו לשום מטרה אחרת.

## העברה למעסיקים

קורות חיים מועברים למעסיק רק לצורך מועמדות קונקרטית. אם סימנת בפרופיל שאת רוצה שנפנה אלייך לפני שליחה — נעשה זאת.

## דיוור

מיילים על משרות נשלחים רק למי שאישרה זאת. בכל מייל יש קישור הסרה שפועל מיידית. ההסרה נשמרת ומכובדת גם בפניות עתידיות.

## כמה זמן נשמר המידע

המידע נשמר כל עוד הוא רלוונטי להתאמות תעסוקתיות. אפשר לבקש מחיקה בכל שלב, ואז נמחק את הרשומה ואת הקבצים.

## הזכויות שלך

לפי חוק הגנת הפרטיות, יש לך זכות לעיין במידע שנשמר עלייך, לבקש את תיקונו, ולבקש את מחיקתו. לכל בקשה — פני אלינו במייל ${CONTACT_DETAILS.email} ונטפל בה.

## אבטחה

המידע נשמר בשרתים מאובטחים עם הצפנה. הגישה למאגר מוגבלת לצוות ${BRAND.name} בלבד.

## עוגיות

האתר משתמש בעוגיות הכרחיות בלבד — לשמירת מצב ההתחברות שלך. אין עוגיות פרסום או מעקב.

## שינויים

אם נעדכן את המדיניות, נפרסם כאן את הגרסה המעודכנת עם תאריך.`;

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  return (
    <PageShell user={user} title="מדיניות פרטיות">
      <Section>
        <div className="mx-auto max-w-2xl">
          <Markdown source={POLICY} />
        </div>
      </Section>
    </PageShell>
  );
}
