import type { SupabaseClient } from "@supabase/supabase-js";
import { storageKey } from "@/lib/utils";

/**
 * Files go from the browser straight to Storage, then the server picks them up.
 *
 * Vercel rejects any request body over 4.5MB before our code runs, so a
 * scanned PDF or a phone photo of a CV failed with a meaningless error while
 * the page promised 15MB. Now the browser asks /api/upload-url for a one-time
 * upload URL, uploads under `incoming/`, and sends only the path.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type UploadPurpose = "cv" | "import" | "lead";

export const UPLOAD_BUCKET: Record<UploadPurpose, "cvs" | "requirements"> = {
  cv: "cvs",
  import: "cvs",
  lead: "requirements",
};

const INCOMING_PATH = /^incoming\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}$/;

/** Only paths we handed out are accepted — never an arbitrary object key. */
export function isIncomingPath(path: unknown): path is string {
  return typeof path === "string" && INCOMING_PATH.test(path);
}

export function newIncomingPath(fileName: string) {
  return `incoming/${crypto.randomUUID()}/${storageKey(fileName)}`;
}

export async function readIncoming(
  admin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw new Error("הקובץ שהועלה לא נמצא. נסי להעלות אותו שוב.");
  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error("הקובץ גדול מדי (עד 15MB).");
  return buffer;
}

export async function moveIncoming(admin: SupabaseClient, bucket: string, from: string, to: string) {
  const { error } = await admin.storage.from(bucket).move(from, to);
  if (error) throw error;
}

export async function discardIncoming(admin: SupabaseClient, bucket: string, path: string) {
  await admin.storage
    .from(bucket)
    .remove([path])
    .catch(() => undefined);
}
