import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "הסרה מרשימת התפוצה", robots: { index: false, follow: false } };

/**
 * One-click unsubscribe target for the link in every campaign email.
 *
 * Required by amendment 40 to the Israeli Communications Law: the opt-out must
 * work without the recipient having to log in or reply. Honoured immediately —
 * `unsubscribed_at` excludes her from every future send.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const user = await getCurrentUser();

  let state: "done" | "missing" | "error" = "missing";

  if (c && adminConfigured()) {
    try {
      const admin = createAdminClient();
      const { error } = await admin
        .from("candidates")
        .update({ unsubscribed_at: new Date().toISOString(), consent_marketing: false })
        .eq("id", c);
      state = error ? "error" : "done";
      if (!error) {
        await admin.from("activity_log").insert({ candidate_id: c, kind: "unsubscribed" });
      }
    } catch {
      state = "error";
    }
  }

  const copy = {
    done: {
      title: "הוסרת מרשימת התפוצה",
      body: "לא נשלח אלייך יותר מיילים על משרות. קורות החיים שלך נשארים במאגר — אם תרצי שנמחק אותם לגמרי, כתבי לנו.",
    },
    missing: {
      title: "הקישור אינו תקין",
      body: "נראה שהקישור חסר או פג תוקף. אפשר לכתוב לנו ונסיר אותך ידנית.",
    },
    error: {
      title: "משהו השתבש",
      body: "לא הצלחנו להסיר אותך אוטומטית. כתבי לנו ונטפל בזה מיד.",
    },
  }[state];

  return (
    <PageShell user={user} title={copy.title}>
      <Section>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[17px] leading-relaxed text-ink/75">{copy.body}</p>
          <ButtonLink href="/" className="mt-8">
            חזרה לאתר
          </ButtonLink>
        </div>
      </Section>
    </PageShell>
  );
}
