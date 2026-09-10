import { NextResponse } from "next/server";
import { describeParseError, MAX_PARSE_BYTES, parseCv, parserConfigured } from "@/lib/cv-parser";
import { UnreadableFileError } from "@/lib/cv-text";
import { isIncomingPath, readIncoming } from "@/lib/incoming";
import { rateLimited } from "@/lib/rate-limit";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Public CV-scan endpoint: a candidate uploads her file on /submit-cv and the
 * extracted fields come back to pre-fill the form for her confirmation.
 *
 * The file itself was already uploaded to Storage by the browser (JSON body
 * with its path). A voice transcript is small and still arrives as a form.
 *
 * The scan is a convenience, never a gate — every failure path here returns a
 * structured error the client turns into "מלאי ידנית", and the submission
 * itself still goes through /api/candidate with the same uploaded file.
 */
export async function POST(request: Request) {
  if (!parserConfigured()) {
    return NextResponse.json(
      { error: "הסריקה האוטומטית אינה זמינה כרגע.", available: false },
      { status: 503 },
    );
  }

  // Every scan is a paid model call on a public page.
  if (rateLimited(request, "parse-cv", 12, 10 * 60_000)) {
    return NextResponse.json(
      { error: "יותר מדי סריקות בזמן קצר. אפשר למלא את הפרטים ידנית." },
      { status: 429 },
    );
  }

  let buffer: Buffer;
  let fileName: string;
  let voice = false;

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (!isIncomingPath(body?.path) || !adminConfigured()) {
      return NextResponse.json({ error: "לא התקבל קובץ." }, { status: 400 });
    }
    fileName = String(body.fileName ?? "").slice(0, 200) || body.path;
    try {
      buffer = await readIncoming(createAdminClient(), "cvs", body.path);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "לא התקבל קובץ." },
        { status: 400 },
      );
    }
  } else {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "לא התקבל קובץ." }, { status: 400 });
    }
    if (file.size > MAX_PARSE_BYTES) {
      return NextResponse.json({ error: "הקובץ גדול מדי (עד 15MB)." }, { status: 400 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
    voice = form?.get("voice") === "1";
  }

  try {
    const { parsed } = await parseCv(buffer, fileName, { voice });
    return NextResponse.json({ ok: true, fields: parsed });
  } catch (err) {
    console.error("public cv parse failed:", fileName, err);
    // A file type we can't read gets its specific reason (e.g. HEIC); anything
    // else stays generic for the candidate.
    return NextResponse.json(
      {
        error:
          err instanceof UnreadableFileError
            ? describeParseError(err).message
            : "לא הצלחנו לקרוא את הקובץ אוטומטית. אפשר למלא את הפרטים ידנית.",
      },
      { status: 422 },
    );
  }
}
