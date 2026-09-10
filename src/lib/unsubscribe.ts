import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

/**
 * Unsubscribe logic shared by the confirm page and the one-click endpoint.
 *
 * Reading and writing are deliberately separate functions: the page only ever
 * reads. Mail filters (Outlook Safe Links, Gmail, corporate scanners) open every
 * link in a message, so an unsubscribe that happens on GET silently removes
 * people who never clicked anything.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export type SubscriptionStatus = "subscribed" | "already" | "invalid" | "error";
export type UnsubscribeOutcome = "done" | "already" | "invalid" | "error";

/** Read-only. Garbage ids and deleted candidates are "invalid" — never a success. */
export async function subscriptionStatus(id: string | undefined): Promise<SubscriptionStatus> {
  if (!isUuid(id)) return "invalid";
  if (!adminConfigured()) return "error";
  try {
    const { data, error } = await createAdminClient()
      .from("candidates")
      .select("id, unsubscribed_at")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return "error";
    if (!data) return "invalid";
    return data.unsubscribed_at ? "already" : "subscribed";
  } catch {
    return "error";
  }
}

/**
 * Removes the candidate from every future send. Only the row that is still
 * subscribed is updated, so a second click reports "already" instead of
 * rewriting the original date and logging twice.
 */
export async function unsubscribe(
  id: string | undefined,
  via: "page" | "one_click",
): Promise<UnsubscribeOutcome> {
  if (!isUuid(id)) return "invalid";
  if (!adminConfigured()) return "error";
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("candidates")
      .update({ unsubscribed_at: new Date().toISOString(), consent_marketing: false })
      .eq("id", id)
      .is("deleted_at", null)
      .is("unsubscribed_at", null)
      .select("id");
    if (error) return "error";

    if (!data?.length) {
      const status = await subscriptionStatus(id);
      // Still subscribed after an update that matched nothing: don't claim success.
      return status === "subscribed" ? "error" : status;
    }

    const { error: logError } = await admin
      .from("activity_log")
      .insert({ candidate_id: id, kind: "unsubscribed", detail: { via } });
    if (logError) console.error("[unsubscribe] activity_log:", logError.message);

    return "done";
  } catch {
    return "error";
  }
}
