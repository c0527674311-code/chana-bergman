import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import {
  campaignReplyTo,
  INVALID_EMAIL_ERROR,
  isValidEmail,
  mailProvider,
  sendBulk,
  type MailRecipient,
  type SendOutcome,
} from "@/lib/mailer";
import { isUuid } from "@/lib/unsubscribe";
import { DEMO_CANDIDATES } from "@/lib/demo-data";

export const runtime = "nodejs";
/** Batches of 100 with rate-limit backoff: a few thousand recipients outlast the platform default. */
export const maxDuration = 300;

/** ids per `.in()` — hundreds of uuids in one query string exceed URL limits. */
const ID_CHUNK = 100;
const INSERT_CHUNK = 500;

type Reason = { reason: string; count: number };

type CandidateRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  consent_marketing: boolean;
  unsubscribed_at: string | null;
};

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function tally(reasons: string[]): Reason[] {
  const counts = new Map<string, number>();
  for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const input = (await request.json().catch(() => ({}))) as {
    subject?: string;
    body?: string;
    candidateIds?: unknown;
    requirementId?: unknown;
    clientKey?: unknown;
  };
  const subject = input.subject?.trim();
  const body = input.body;

  if (!subject || !body?.trim()) {
    return NextResponse.json({ error: "נא למלא נושא ותוכן." }, { status: 400 });
  }
  const rawIds = Array.isArray(input.candidateIds)
    ? [...new Set(input.candidateIds.filter((id): id is string => typeof id === "string"))]
    : [];
  if (!rawIds.length) {
    return NextResponse.json({ error: "לא נבחרו נמענות." }, { status: 400 });
  }

  if (!adminConfigured()) {
    const count = DEMO_CANDIDATES.filter((c) => rawIds.includes(c.id)).length;
    console.warn(`[demo] דיוור ל-${count} נמענות לא נשלח — המערכת במצב הדגמה.`);
    return NextResponse.json({
      ok: true,
      demo: true,
      sent: 0,
      failed: count,
      reasons: [{ reason: "המערכת במצב הדגמה — לא נשלחו מיילים", count }],
      skipped: [],
    });
  }

  const provider = mailProvider();
  if (!provider.ok) {
    return NextResponse.json({ error: `${provider.error} שום מייל לא נשלח.` }, { status: 503 });
  }

  const candidateIds = rawIds.filter(isUuid);
  const requirementId = isUuid(input.requirementId) ? input.requirementId : null;
  const clientKey = isUuid(input.clientKey) ? input.clientKey : null;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const admin = createAdminClient();
  let campaignId: string | null = null;
  let sendingStarted = false;

  try {
    // Re-check consent server-side at send time: never trust the list the
    // browser sent — it may be minutes old, or hand-made.
    const rows: CandidateRow[] = [];
    for (const ids of chunks(candidateIds, ID_CHUNK)) {
      const { data, error } = await admin
        .from("candidates")
        .select("id, first_name, last_name, email, consent_marketing, unsubscribed_at")
        .in("id", ids)
        .is("deleted_at", null);
      if (error) throw error;
      rows.push(...((data ?? []) as CandidateRow[]));
    }

    const skippedReasons: string[] = Array(rawIds.length - rows.length).fill("לא נמצאה במאגר");
    const eligible: Array<CandidateRow & { email: string }> = [];
    for (const r of rows) {
      const email = r.email?.trim();
      if (r.unsubscribed_at) skippedReasons.push("הסירה את עצמה מרשימת התפוצה");
      else if (!r.consent_marketing) skippedReasons.push("לא אישרה קבלת דיוור");
      else if (!email) skippedReasons.push("אין כתובת מייל");
      else eligible.push({ ...r, email });
    }
    const skipped = tally(skippedReasons);

    if (!eligible.length) {
      const detail = skipped.map((s) => `${s.reason}: ${s.count}`).join(", ");
      return NextResponse.json(
        { error: `אף אחת מהנבחרות לא יכולה לקבל את הדיוור (${detail}).`, skipped },
        { status: 400 },
      );
    }

    const { data: campaign, error: cErr } = await admin
      .from("campaigns")
      .insert({
        name: subject.slice(0, 120),
        subject,
        body_html: body,
        requirement_id: requirementId,
        status: "sending",
        provider: provider.name,
        client_key: clientKey,
      })
      .select("id")
      .single();
    if (cErr) {
      // The same dialog already sent this (double click, retry after a
      // timeout): report that campaign, never send it again.
      if (cErr.code === "23505" && clientKey) return existingCampaign(admin, clientKey);
      console.error("campaign insert failed:", cErr);
      return NextResponse.json({ error: "יצירת הדיוור נכשלה — שום מייל לא נשלח." }, { status: 500 });
    }
    campaignId = campaign.id as string;

    // Addresses Resend would reject are recorded as failed up front instead of
    // sinking the batch they land in.
    const queuedIds = new Set<string>();
    for (const part of chunks(eligible, INSERT_CHUNK)) {
      const { data, error } = await admin
        .from("campaign_recipients")
        .insert(
          part.map((r) => {
            const valid = isValidEmail(r.email);
            return {
              campaign_id: campaignId,
              candidate_id: r.id,
              email: r.email,
              status: valid ? ("queued" as const) : ("failed" as const),
              error: valid ? null : INVALID_EMAIL_ERROR,
            };
          }),
        )
        .select("candidate_id, status");
      if (error) {
        console.error("campaign_recipients insert failed:", error);
        await admin.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
        return NextResponse.json(
          { error: "שמירת רשימת הנמענות נכשלה — שום מייל לא נשלח." },
          { status: 500 },
        );
      }
      for (const d of data ?? []) if (d.status === "queued") queuedIds.add(d.candidate_id);
    }

    // Only rows the database holds as queued go out — a recipient already
    // marked sent in this campaign is never mailed again.
    const recipients: MailRecipient[] = eligible
      .filter((r) => queuedIds.has(r.id))
      .map((r) => ({
        id: r.id,
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name,
        unsubscribeUrl: `${siteUrl}/unsubscribe?c=${r.id}`,
        oneClickUnsubscribeUrl: `${siteUrl}/api/unsubscribe?id=${r.id}`,
      }));
    const invalidErrors = eligible.filter((r) => !isValidEmail(r.email)).map(() => INVALID_EMAIL_ERROR);

    const bookkeeping: string[] = [];
    const record = async (delta: SendOutcome) => {
      const now = new Date().toISOString();
      for (const ids of chunks(delta.sent.map((s) => s.id), ID_CHUNK)) {
        const { error } = await admin
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: now, error: null })
          .eq("campaign_id", campaignId)
          .in("candidate_id", ids);
        if (error) bookkeeping.push(`campaign_recipients: ${error.message}`);
      }
      const byError = new Map<string, string[]>();
      for (const f of delta.failed) byError.set(f.error, [...(byError.get(f.error) ?? []), f.id]);
      for (const [message, allIds] of byError) {
        for (const ids of chunks(allIds, ID_CHUNK)) {
          const { error } = await admin
            .from("campaign_recipients")
            .update({ status: "failed", error: message.slice(0, 500) })
            .eq("campaign_id", campaignId)
            .in("candidate_id", ids);
          if (error) bookkeeping.push(`campaign_recipients: ${error.message}`);
        }
      }
    };

    sendingStarted = true;
    const result = await sendBulk(subject, body, recipients, {
      idempotencyScope: campaignId,
      onProgress: record,
    });

    const sentCount = result.sent.length;
    const { error: statusErr } = await admin
      .from("campaigns")
      .update({
        status: sentCount > 0 ? "sent" : "failed",
        sent_at: sentCount > 0 ? new Date().toISOString() : null,
      })
      .eq("id", campaignId);
    if (statusErr) bookkeeping.push(`campaigns: ${statusErr.message}`);

    const failedById = new Map(result.failed.map((f) => [f.id, f.error]));
    const activity = [
      ...result.sent.map((s) => ({
        candidate_id: s.id,
        requirement_id: requirementId,
        kind: "campaign_sent",
        detail: { subject, campaign_id: campaignId },
      })),
      ...eligible
        .filter((r) => failedById.has(r.id) || !isValidEmail(r.email))
        .map((r) => ({
          candidate_id: r.id,
          requirement_id: requirementId,
          kind: "campaign_failed",
          detail: { subject, campaign_id: campaignId, error: failedById.get(r.id) ?? INVALID_EMAIL_ERROR },
        })),
    ];
    for (const part of chunks(activity, INSERT_CHUNK)) {
      const { error } = await admin.from("activity_log").insert(part);
      if (error) bookkeeping.push(`activity_log: ${error.message}`);
    }

    if (bookkeeping.length) console.error(`campaign ${campaignId} bookkeeping failed:`, bookkeeping);

    return NextResponse.json({
      ok: true,
      campaignId,
      sent: sentCount,
      failed: result.failed.length + invalidErrors.length,
      reasons: tally([...invalidErrors, ...result.failed.map((f) => f.error)]),
      skipped,
      replyTo: sentCount > 0 ? campaignReplyTo() : undefined,
      // The mail has already left; a red line on the result screen, not an
      // error that invites sending again.
      warning: bookkeeping.length
        ? "המיילים יצאו, אבל חלק מהסטטוסים לא נשמרו במערכת. אין לשלוח את הדיוור שוב."
        : undefined,
    });
  } catch (err) {
    console.error("campaign failed:", err);
    if (campaignId && !sendingStarted) {
      await admin.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
    }
    return NextResponse.json(
      {
        error: sendingStarted
          ? "הדיוור נקטע באמצע השליחה. אין לשלוח שוב — בדקי במסך הדיוור מה יצא."
          : "שליחת הדיוור נכשלה — שום מייל לא נשלח.",
      },
      { status: 500 },
    );
  }
}

async function existingCampaign(admin: SupabaseClient, clientKey: string) {
  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("id, status")
    .eq("client_key", clientKey)
    .maybeSingle();
  if (error || !campaign) {
    return NextResponse.json(
      { error: "הדיוור הזה כבר נוצר, אבל לא הצלחנו לטעון את מצבו. אין לשלוח שוב — בדקי במסך הדיוור." },
      { status: 500 },
    );
  }

  const count = (status: "sent" | "failed") =>
    admin
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", status);
  const [sent, failed, errors] = await Promise.all([
    count("sent"),
    count("failed"),
    admin
      .from("campaign_recipients")
      .select("error")
      .eq("campaign_id", campaign.id)
      .eq("status", "failed")
      .limit(1000),
  ]);

  return NextResponse.json({
    ok: true,
    duplicate: true,
    inProgress: campaign.status === "sending",
    campaignId: campaign.id,
    sent: sent.count ?? 0,
    failed: failed.count ?? 0,
    reasons: tally((errors.data ?? []).map((e) => (e.error as string | null) ?? "לא ידוע")),
    skipped: [],
    replyTo: campaignReplyTo(),
  });
}
