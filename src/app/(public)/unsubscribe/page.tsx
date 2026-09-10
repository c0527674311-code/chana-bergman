import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CONTACT_DETAILS } from "@/lib/content/site";
import { subscriptionStatus } from "@/lib/unsubscribe";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "הסרה מרשימת התפוצה", robots: { index: false, follow: false } };

/**
 * Target of the unsubscribe link in every campaign email.
 *
 * Required by amendment 40 to the Israeli Communications Law: the opt-out must
 * work without the recipient having to log in or reply. Rendering this page
 * changes nothing — it used to unsubscribe on load, and the link scanners in
 * mail filters open every link, so people were removed without ever clicking.
 * The button POSTs to /api/unsubscribe, which is also the one-click endpoint
 * mail clients call directly.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string | string[]; done?: string; failed?: string }>;
}) {
  const params = await searchParams;
  const c = typeof params.c === "string" ? params.c.trim() : undefined;
  const [user, status] = await Promise.all([getCurrentUser(), subscriptionStatus(c)]);

  // The query flags only choose between true states; the database decides.
  const view =
    status === "already"
      ? params.done
        ? "done"
        : "already"
      : status === "subscribed"
        ? params.failed
          ? "error"
          : "confirm"
        : status;

  const copy = {
    confirm: {
      title: "הסרה מרשימת התפוצה",
      body: "בלחיצה על הכפתור לא יישלחו אלייך יותר מיילים על משרות. קורות החיים שלך נשארים במאגר.",
    },
    done: {
      title: "הוסרת מרשימת התפוצה",
      body: "לא נשלח אלייך יותר מיילים על משרות. קורות החיים שלך נשארים במאגר — אם תרצי שנמחק אותם לגמרי, כתבי לנו.",
    },
    already: {
      title: "כבר הוסרת מרשימת התפוצה",
      body: "הכתובת שלך כבר לא ברשימת התפוצה, ולא יישלחו אלייך מיילים על משרות.",
    },
    invalid: {
      title: "הקישור אינו תקין",
      body: "לא מצאנו את הפרטים שבקישור — ייתכן שהוא חסר או הועתק חלקית. אפשר לכתוב לנו ונסיר אותך ידנית.",
    },
    error: {
      title: "משהו השתבש",
      body: "לא הצלחנו להסיר אותך אוטומטית. כתבי לנו ונטפל בזה מיד.",
    },
  }[view];

  return (
    <PageShell user={user} title={copy.title}>
      <Section>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[17px] leading-relaxed text-ink/75">{copy.body}</p>

          {(view === "invalid" || view === "error") && (
            <p className="mt-3 text-[16px] text-ink/75">
              <a href={`mailto:${CONTACT_DETAILS.email}`} dir="ltr" className="focus-brand font-semibold text-primary underline">
                {CONTACT_DETAILS.email}
              </a>
            </p>
          )}

          {(view === "confirm" || view === "error") && c ? (
            <form method="post" action={`/api/unsubscribe?id=${encodeURIComponent(c)}`} className="mt-8">
              <Button type="submit" withArrow={false}>
                {view === "error" ? "לנסות שוב" : "הסירו אותי מרשימת התפוצה"}
              </Button>
            </form>
          ) : (
            <ButtonLink href="/" className="mt-8">
              חזרה לאתר
            </ButtonLink>
          )}
        </div>
      </Section>
    </PageShell>
  );
}
