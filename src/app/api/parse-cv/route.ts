import { NextResponse } from "next/server";
import { MAX_PARSE_BYTES, parseCv, parserConfigured } from "@/lib/cv-parser";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Public CV-scan endpoint: a candidate uploads her file on /submit-cv and the
 * extracted fields come back to pre-fill the form for her confirmation.
 *
 * The scan is a convenience, never a gate — every failure path here returns a
 * structured error the client turns into "מלאי ידנית", and the submission
 * itself still goes through /api/candidate with the original file attached.
 */
export async function POST(request: Request) {
  if (!parserConfigured()) {
    return NextResponse.json(
      { error: "הסריקה האוטומטית אינה זמינה כרגע.", available: false },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "לא התקבל קובץ." }, { status: 400 });
  }
  if (file.size > MAX_PARSE_BYTES) {
    return NextResponse.json({ error: "הקובץ גדול מדי (עד 15MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const voice = form?.get("voice") === "1";
    const { parsed } = await parseCv(buffer, file.type || "", file.name, { voice });
    return NextResponse.json({ ok: true, fields: parsed });
  } catch (err) {
    console.error("public cv parse failed:", file.name, err);
    return NextResponse.json(
      { error: "לא הצלחנו לקרוא את הקובץ אוטומטית. אפשר למלא את הפרטים ידנית." },
      { status: 422 },
    );
  }
}
