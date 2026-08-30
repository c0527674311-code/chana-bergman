import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Section } from "@/components/site/Section";
import { CandidateForm } from "@/components/forms/CandidateForm";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "שליחת קורות חיים",
  description:
    "השאירי קורות חיים פעם אחת והיכנסי למאגר שמנהלי הגיוס בחברות ההייטק המובילות פונים אליו. בלי הרשמה, מכל מכשיר.",
};

export default async function SubmitCvPage() {
  const user = await getCurrentUser();

  return (
    <>
      <Header user={user} />
      <main>
        <Section tone="canvas" className="rounded-b-[var(--radius-panel)]">
          <div className="mx-auto max-w-[760px]">
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-navy">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path
                    d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 17v2a1.8 1.8 0 0 0 1.8 1.8h12.4A1.8 1.8 0 0 0 20 19v-2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h1 className="mt-5 text-[34px] font-extrabold leading-tight text-navy sm:text-[42px]">
                שליחת קורות חיים
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-[17px] leading-relaxed text-ink/75">
                פעם אחת ממלאים — ואת במאגר. כשתגיע דרישה שמתאימה לך, חנה תפנה אלייך ישירות.
                אין צורך בהרשמה, ואפשר להעלות גם צילום מהנייד.
              </p>
            </div>

            <div className="mt-10 rounded-[var(--radius-panel)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-10">
              <CandidateForm mode="submit" />
            </div>

            <p className="mx-auto mt-6 max-w-xl text-center text-[13px] leading-relaxed text-ink/55">
              הפרטים נשמרים במאגר של חנה ברגמן ומשמשים להתאמת משרות בלבד. לא מעבירים קורות חיים
              למעסיק בלי ידיעתך. אפשר לבקש עדכון או מחיקה בכל שלב.
            </p>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
