import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { HeroVideo } from "@/components/site/HeroVideo";
import { Card, Section } from "@/components/site/Section";
import { COMPANIES } from "@/components/site/CompanyLogos";
import { LogoMarquee, TextMarquee } from "@/components/site/Marquee";
import { ButtonLink } from "@/components/ui/Button";
import { EmployerLeadForm } from "@/components/forms/EmployerLeadForm";
import { BRAND, FAQ } from "@/lib/content/site";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "למעסיקים — רוצים לגייס את הטובים ביותר?",
  description:
    "מעל 20 שנה של השמות מדויקות בהייטק. שולחים דרישה — ומקבלים רק מועמדות שבאמת מתאימות. עמלה רק על השמה שנקלטה.",
};

const STATS = [
  { value: "20+", suffix: "שנה", label: "ניסיון בהשמה בהייטק" },
  { value: "אלפי", suffix: "", label: "השמות מוצלחות" },
  { value: "24", suffix: "שעות", label: "עד רשימה ראשונית" },
  { value: "0", suffix: "₪", label: "עד שמישהי נקלטת אצלכם" },
];

/** The three steps from the original mainEmployers page, fleshed out. */
const STEPS = [
  {
    title: "השאירו פרטים",
    body: "טופס קצר, או פשוט העלאת מסמך הדרישות כמו שהוא — לא צריך לנסח כלום מחדש.",
  },
  {
    title: "כל השאר עלינו…",
    body: "היכרות אישית עם המועמדות + מערכת AI שסורקת את כל המאגר מול הדרישה שלכם. לא שולחות כמות — שולחות דיוק.",
  },
  {
    title: "המועמדת הנבחרת בדרך אליכם",
    body: "רק מי שעונה על הדרישה, כשכל אחת כבר אישרה שהמשרה רלוונטית לה. אתם מראיינים — אנחנו מלוות עד החתימה.",
  },
];

const ABOUT = [
  "עם ניסיון עשיר של מעל 20 שנה בתחום ההשמה בהייטק, אנחנו גאות להיות הבחירה הראשונה של החברות הגדולות במשק. במהלך השנים ביצענו אלפי השמות מוצלחות, תוך התאמה מושלמת בין המועמדת לתפקיד.",
  "בזכות מערכת חדשנית שפיתחנו, בשילוב טכנולוגיות AI מתקדמות, אנחנו מציעות פתרונות גיוס מדויקים ויעילים יותר: המערכת מנתחת את כל המאגר מול הדרישה שלכם ומביאה אליכם רק מועמדות שמתאימות בדיוק לצרכים של העסק — במהירות ובאיכות גבוהה.",
  "כאן תמצאו את המועמדות המוכשרות ביותר, ותיהנו משירות מקצועי וממוקד, שנעשה באכפתיות ובזמן קצר.",
];

const REASONS = [
  {
    icon: "target",
    title: "רק מי שמתאימה",
    body: "לא עשרים קורות חיים לסינון. שלוש-ארבע מועמדות שעונות על הדרישה, עם שורת הסבר למה כל אחת.",
  },
  {
    icon: "vault",
    title: "מאגר שאין בשום מקום אחר",
    body: "בוגרות המסלולים הטכנולוגיים המובילים במגזר החרדי, מלוות אישית לאורך שנים. רובן לא מפרסמות קורות חיים באף לוח.",
  },
  {
    icon: "shield",
    title: "אפס סיכון",
    body: "בלי ריטיינר, בלי דמי חיפוש. עמלה אחת, רק על מועמדת שנקלטה בפועל. לא התאימה? לא שילמתם.",
  },
  {
    icon: "heart",
    title: "מועמדות שמגיעות לראיון",
    body: "לפני שקורות חיים מגיעים אליכם, כל מועמדת כבר אישרה שהמשרה מעניינת אותה. בלי ראיונות סרק.",
  },
  {
    icon: "clock",
    title: "מהירות אמיתית",
    body: "המערכת סורקת את כל המאגר מול הדרישה תוך שניות. ברוב המקרים — רשימה ראשונית בתוך יום עסקים.",
  },
  {
    icon: "person",
    title: "עין אנושית, לא רק אלגוריתם",
    body: "חנה מכירה את המועמדות אישית — את המסלול, את היכולות, את מה שלא כתוב בקורות החיים.",
  },
];

const QUOTES = [
  {
    quote: "קיבלנו ארבע מועמדות. שלוש היו רלוונטיות באמת, ואחת נקלטה תוך שבועיים.",
    role: "מנהלת גיוס, חברת תוכנה",
  },
  {
    quote: "חנה לא שולחת קורות חיים — היא ממליצה על אדם שהיא מכירה. זה כל ההבדל.",
    role: "VP R&D",
  },
];

export default async function EmployersPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Header user={user} transparent />
      <main>
        {/* Full-viewport video hero, mirroring the homepage treatment */}
        <section className="relative lg:grid lg:min-h-screen lg:grid-cols-[41%_59%]">
          {/* Absolute from lg up so the portrait video can't stretch the hero. */}
          <div className="relative overflow-hidden rounded-b-[40px] lg:rounded-bl-[44px] lg:rounded-br-none lg:rounded-t-none">
            <HeroVideo
              src="/videos/hero-employers.mp4"
              className="h-[45vh] min-h-[300px] lg:absolute lg:inset-0 lg:h-full"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center pt-12 lg:pt-28">
            <div className="px-5 pb-14 text-center lg:px-10 lg:text-start">
              <p
                data-reveal
                dir="ltr"
                className="font-display text-[13px] font-semibold uppercase tracking-[0.35em] text-mint-600"
              >
                For Employers
              </p>
              <h1
                data-reveal
                style={{ "--reveal-delay": "110ms" } as React.CSSProperties}
                className="mt-3 text-[40px] font-extrabold leading-[1.12] text-navy sm:text-[56px] xl:text-[62px]"
              >
                רוצים לגייס
                <span className="block">את הטובים ביותר?</span>
              </h1>
              <p
                data-reveal
                style={{ "--reveal-delay": "220ms" } as React.CSSProperties}
                className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink/75 lg:mx-0"
              >
                אתם שולחים דרישה — ומקבלים רק קורות חיים מדויקים, מתוך מאגר מתכנתות שלא
                תמצאו בשום ערוץ אחר. עמלה? רק כשמישהי נקלטה.
              </p>
              <div
                data-reveal
                style={{ "--reveal-delay": "330ms" } as React.CSSProperties}
                className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
              >
                <ButtonLink href="#lead-form" size="lg">
                  שלחו לנו דרישה עכשיו
                </ButtonLink>
                <ButtonLink href="/#testimonials" variant="outline" size="lg">
                  מה מספרים עלינו
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Stats band */}
      <Section className="py-12 lg:py-14">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              data-reveal
              style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}
              className="rounded-[var(--radius-card)] bg-canvas p-6 text-center"
            >
              <dd className="font-display text-[38px] font-bold leading-none text-navy">
                {s.value}
                {s.suffix && <span className="ms-1 text-[20px] font-semibold text-primary">{s.suffix}</span>}
              </dd>
              <dt className="mt-2 text-[14px] font-medium text-ink/65">{s.label}</dt>
            </div>
          ))}
        </dl>
      </Section>

      {/* About — the original page's copy, polished */}
      <Section tone="canvas" className="rounded-[var(--radius-panel)]">
        <h2
          data-reveal
          dir="ltr"
          className="font-display text-center text-[34px] font-semibold text-navy sm:text-[42px]"
        >
          About <span className="mark-mint">us</span>
        </h2>
        <p data-reveal className="mt-2 text-center text-[20px] font-semibold text-navy">
          {BRAND.name}
        </p>
        <div className="mx-auto mt-8 max-w-2xl space-y-5 text-center text-[16px] leading-[1.9] text-ink/80">
          {ABOUT.map((p, i) => (
            <p key={i} data-reveal style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}>
              {p}
            </p>
          ))}
        </div>
        <div data-reveal className="mt-10 text-center">
          <h3 className="text-[22px] font-bold text-navy">הצטרפו אלינו להצלחה!</h3>
          <p className="mt-2 text-[16px] text-ink/70">
            השאירו פרטים עכשיו, ואנחנו נדאג להתאים לכם את הטאלנט הבא.
          </p>
          <ButtonLink href="#lead-form" size="md" className="mt-5">
            הצטרפו למובילים
          </ButtonLink>
        </div>
      </Section>

      {/* How does it work — the original three steps */}
      <Section>
        <h2
          data-reveal
          dir="ltr"
          className="font-display text-center text-[30px] font-semibold text-navy sm:text-[38px]"
        >
          How does it <span className="mark-mint">work</span>?
        </h2>
        <p data-reveal className="mt-2 text-center text-[17px] text-ink/70">
          תהליך גיוס פשוט, מהיר ומדויק
        </p>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <Card revealDelay={i * 130} highlighted={i === 0} className="h-full pt-10">
                <span
                  aria-hidden="true"
                  className="font-display absolute -top-1 end-5 text-[64px] font-bold leading-none text-primary/15"
                >
                  {i + 1}
                </span>
                <h3 className="text-[18px] font-bold text-navy">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* Why us */}
      <Section tone="canvas" className="rounded-[var(--radius-panel)]">
        <h2 data-reveal className="text-center text-[30px] font-bold text-navy">
          למה מנהלי גיוס <span className="mark-mint">חוזרים</span> אלינו
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((r, i) => (
            <Card key={r.title} revealDelay={(i % 3) * 120} className="h-full">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-100 text-navy">
                <Icon name={r.icon} />
              </span>
              <h3 className="mt-4 text-[18px] font-bold text-navy">{r.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{r.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-14">
          <h3 data-reveal className="text-center text-[22px] font-bold text-navy">
            חברות שכבר מגייסות דרכנו
          </h3>
          <div className="mt-6">
            <LogoMarquee companies={COMPANIES} />
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          {QUOTES.map((q, i) => (
            <Card key={q.quote} revealDelay={i * 140}>
              <span className="font-display text-[40px] leading-none text-mint" aria-hidden="true">
                &rdquo;
              </span>
              <blockquote className="mt-1 text-[16px] leading-relaxed text-ink/85">{q.quote}</blockquote>
              <footer className="mt-4 text-[13.5px] text-ink/60">{q.role}</footer>
            </Card>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section className="pt-4">
        <h2 data-reveal className="text-center text-[26px] font-bold text-navy">
          שאלות נפוצות
        </h2>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-2.5">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-[20px] bg-canvas px-6 py-4"
            >
              <summary className="focus-brand flex cursor-pointer list-none items-center justify-between gap-3 rounded text-[16px] font-bold text-navy [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint-100 text-navy transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pt-3 text-[15px] leading-relaxed text-ink/75">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* The original CONTACT US band, leading into the form */}
      <div className="pt-6">
        <TextMarquee text="CONTACT US" durationSeconds={30} />
      </div>

      <Section id="lead-form" tone="canvas" className="rounded-[var(--radius-panel)] pt-14">
        <div data-reveal className="text-center">
          <h2 className="text-[30px] font-bold leading-tight text-navy sm:text-[38px]">
            ספרו לנו מה אתם <span className="mark-mint">מחפשים</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[16px] text-ink/70">
            ואנחנו נמצא עבורכם את הטובים ביותר. אפשר גם פשוט להעלות את מסמך הדרישות —
            נחזור אליכם עם קורות חיים מדויקים, ברוב המקרים בתוך יום עסקים.
          </p>
        </div>
        <div data-reveal className="mx-auto mt-10 max-w-3xl">
          <EmployerLeadForm />
        </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      </>
    ),
    vault: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 8.5V6.7M12 17.3v-1.8M15.5 12h1.8M6.7 12h1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
    shield: (
      <path
        d="M12 3.5 5 6.2v5.3c0 4.4 3 7.6 7 8.9 4-1.3 7-4.5 7-8.9V6.2L12 3.5Zm-2.8 8.4 2 2 3.8-3.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    heart: (
      <path
        d="M12 19.5c-4.5-3.1-7.5-6-7.5-9.2 0-2.3 1.8-4 4-4 1.4 0 2.7.7 3.5 1.9.8-1.2 2.1-1.9 3.5-1.9 2.2 0 4 1.7 4 4 0 3.2-3 6.1-7.5 9.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7.5V12l3 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="8.5" r="3.8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4.8 20c.8-3.6 3.8-5.5 7.2-5.5s6.4 1.9 7.2 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
