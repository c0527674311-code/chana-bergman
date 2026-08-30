import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { sendBulk, type MailRecipient } from "@/lib/mailer";
import { DEMO_CANDIDATES } from "@/lib/demo-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { subject, body, candidateIds, requirementId } = (await request
    .json()
    .catch(() => ({}))) as {
    subject?: string;
    body?: string;
    candidateIds?: string[];
    requirementId?: string;
  };

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "נא למלא נושא ותוכן." }, { status: 400 });
  }
  if (!candidateIds?.length) {
    return NextResponse.json({ error: "לא נבחרו נמענות." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!adminConfigured()) {
    const rows = DEMO_CANDIDATES.filter((c) => candidateIds.includes(c.id));
    console.warn(`[demo] דיוור ל-${rows.length} נמענות לא נשלח — המערכת במצב הדגמה.`);
    return NextResponse.json({ ok: true, demo: true, queued: rows.length });
  }

  try {
    const admin = createAdminClient();

    // Re-check consent server-side: never trust the list the browser sent.
    const { data: rows, error } = await admin
      .from("candidates")
      .select("id, first_name, last_name, email, consent_marketing, unsubscribed_at")
      .in("id", candidateIds)
      .not("email", "is", null)
      .eq("consent_marketing", true)
      .is("unsubscribed_at", null);
    if (error) throw error;

    if (!rows?.length) {
      return NextResponse.json(
        { error: "אף אחת מהנבחרות לא אישרה קבלת דיוור." },
        { status: 400 },
      );
    }

    const { data: campaign, error: cErr } = await admin
      .from("campaigns")
      .insert({
        name: subject.slice(0, 120),
        subject,
        body_html: body,
        requirement_id: requirementId ?? null,
        status: "sending",
        provider: process.env.EMAIL_PROVIDER ?? "none",
      })
      .select("id")
      .single();
    if (cErr) throw cErr;

    await admin.from("campaign_recipients").insert(
      rows.map((r) => ({
        campaign_id: campaign.id,
        candidate_id: r.id,
        email: r.email!,
        status: "queued" as const,
      })),
    );

    const recipients: MailRecipient[] = rows.map((r) => ({
      email: r.email!,
      firstName: r.first_name,
      lastName: r.last_name,
      unsubscribeUrl: `${siteUrl}/unsubscribe?c=${r.id}`,
    }));

    const result = await sendBulk(subject, body, recipients);
    const failedEmails = new Set(result.failed.map((f) => f.email));

    await admin
      .from("campaign_recipients")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("campaign_id", campaign.id)
      .not("email", "in", `(${[...failedEmails].map((e) => `"${e}"`).join(",") || '""'})`);

    await admin
      .from("campaigns")
      .update({
        status: result.sent > 0 ? "sent" : "failed",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    await admin.from("activity_log").insert(
      rows.map((r) => ({
        candidate_id: r.id,
        requirement_id: requirementId ?? null,
        kind: "campaign_sent",
        detail: { subject, campaign_id: campaign.id },
      })),
    );

    return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed.length });
  } catch (err) {
    console.error("campaign failed:", err);
    return NextResponse.json({ error: "שליחת הדיוור נכשלה." }, { status: 500 });
  }
}
