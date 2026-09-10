import { createClient } from "@/lib/supabase/client";

export type UploadPurpose = "cv" | "import" | "lead";

/**
 * Uploads a file straight to Storage (see lib/incoming.ts) and returns its
 * path for the form to send instead of the file.
 *
 * Returns null when the server has no Storage configured (local demo mode);
 * the caller then sends the file itself as before.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<string | null> {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, fileName: file.name, size: file.size, type: file.type }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 503 && json.fallback) return null;
  if (!res.ok) throw new Error(json.error ?? "העלאת הקובץ נכשלה. נסי שוב.");

  const { error } = await createClient()
    .storage.from(json.bucket)
    .uploadToSignedUrl(json.path, json.token, file, { contentType: file.type || undefined });
  if (error) {
    throw new Error(
      /exceed|too large|size/i.test(error.message)
        ? "הקובץ גדול מדי (עד 15MB)."
        : "העלאת הקובץ נכשלה. בדקי את החיבור לאינטרנט ונסי שוב.",
    );
  }
  return json.path as string;
}
