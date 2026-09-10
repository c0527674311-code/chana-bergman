import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_UPLOAD_BYTES,
  newIncomingPath,
  UPLOAD_BUCKET,
  type UploadPurpose,
} from "@/lib/incoming";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Hands the browser a one-time URL to upload a single file to Storage.
 * The bucket itself enforces the 15MB limit; the check here gives a clear
 * message before the upload starts.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const purpose = body?.purpose as UploadPurpose;
  if (!purpose || !(purpose in UPLOAD_BUCKET)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  if (purpose === "import") {
    const denied = await requireAdmin();
    if (denied) return denied;
  } else if (rateLimited(request, "upload-url", 30, 10 * 60_000)) {
    return NextResponse.json(
      { error: "יותר מדי העלאות בזמן קצר. נסי שוב בעוד כמה דקות." },
      { status: 429 },
    );
  }

  const size = Number(body?.size);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "הקובץ ריק." }, { status: 400 });
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `הקובץ גדול מדי (${(size / 1024 / 1024).toFixed(1)}MB). הגודל המרבי הוא 15MB.` },
      { status: 400 },
    );
  }

  if (!adminConfigured()) {
    return NextResponse.json({ error: "Storage לא מוגדר.", fallback: true }, { status: 503 });
  }

  const bucket = UPLOAD_BUCKET[purpose];
  const fileName = String(body?.fileName ?? "").slice(0, 200);
  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUploadUrl(newIncomingPath(fileName));
  if (error || !data) {
    console.error("signed upload url failed:", error);
    return NextResponse.json({ error: "העלאת הקובץ נכשלה. נסי שוב." }, { status: 500 });
  }

  return NextResponse.json({ bucket, path: data.path, token: data.token });
}
