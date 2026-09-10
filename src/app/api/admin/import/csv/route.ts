import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { decodeText } from "@/lib/cv-text";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Minimal RFC-4180 parser — handles quoted fields containing delimiters and newlines. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Maps a header cell to one of our fields — Hebrew or English, Smoove or generic. */
function classifyHeader(raw: string): string | null {
  const h = raw.trim().toLowerCase().replace(/["']/g, "");
  // "סטטוס מייל", "email status", "אישור דיוור במייל" describe the address,
  // they aren't it — and a later one used to replace the real email column.
  if (/mail|מייל|דואל|אימייל/.test(h) && !/status|סטטוס|אישור|confirm|opt|bounce|valid|תקין/.test(h)) {
    return "email";
  }
  if (/phone|mobile|cell|טלפון|נייד|פלאפון/.test(h)) return "phone";
  if (/first ?name|שם פרטי|firstname/.test(h)) return "first_name";
  if (/last ?name|family|שם משפחה|lastname/.test(h)) return "last_name";
  if (/^(full ?name|name|שם|שם מלא)$/.test(h)) return "full_name";
  if (/שנתון|cohort|year|מחזור/.test(h)) return "cohort_year";
  if (/city|עיר|יישוב|ישוב/.test(h)) return "city";
  if (/מוסד|סמינר|institution|school/.test(h)) return "institution";
  return null;
}

type Rec = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  institution: string | null;
  cohort_year: number | null;
};

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "לא התקבל קובץ." }, { status: 400 });
  }

  // Excel on a Hebrew Windows saves CSV as windows-1255, which read as UTF-8
  // turned every header and name into "����".
  const text = decodeText(Buffer.from(await file.arrayBuffer()));
  if (!text) {
    return NextResponse.json({ error: "הקובץ אינו קובץ CSV קריא." }, { status: 400 });
  }
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = parseCsv(text, delimiter);
  if (rows.length < 2) {
    return NextResponse.json({ error: "הקובץ ריק או חסר שורת כותרות." }, { status: 400 });
  }

  // The first column of each kind wins; later look-alikes are ignored.
  const headers: (string | null)[] = [];
  for (const cell of rows[0]) {
    const key = classifyHeader(cell);
    headers.push(key && !headers.includes(key) ? key : null);
  }
  if (!headers.includes("email")) {
    return NextResponse.json(
      { error: "לא נמצאה עמודת מייל בקובץ. ודאי שיש כותרת כמו 'email' או 'מייל'." },
      { status: 400 },
    );
  }

  let skipped = 0;
  const records = new Map<string, Rec>();
  for (const row of rows.slice(1)) {
    const cells: Record<string, string> = {};
    headers.forEach((key, i) => {
      if (key && row[i]?.trim()) cells[key] = row[i].trim();
    });

    if (cells.full_name && !cells.first_name) {
      const parts = cells.full_name.split(/\s+/);
      cells.first_name = parts[0];
      cells.last_name = parts.slice(1).join(" ");
    }

    const email = normalizeEmail(cells.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || records.has(email)) {
      skipped++;
      continue;
    }
    const cohort = cells.cohort_year?.match(/((?:19|20)\d{2})/)?.[1];
    records.set(email, {
      email,
      first_name: cells.first_name || null,
      last_name: cells.last_name || null,
      phone: cells.phone || null,
      city: cells.city || null,
      institution: cells.institution || null,
      cohort_year: cohort ? Number(cohort) : null,
    });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const emails = [...records.keys()];
  let created = 0;
  let merged = 0;

  // One lookup per 100 addresses instead of two round trips per row, which
  // ran a list of a few thousand past the time limit and stopped it halfway.
  const existing = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data, error } = await admin
      .from("candidates")
      .select("id, email_key, first_name, last_name, phone, city, institution, cohort_year, consent_marketing, unsubscribed_at")
      .in("email_key", emails.slice(i, i + 100))
      .is("deleted_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of data ?? []) existing.set(row.email_key as string, row);
  }

  const inserts: Rec[] = [];
  for (const rec of records.values()) {
    const row = existing.get(rec.email);
    if (!row) {
      inserts.push(rec);
      continue;
    }

    // Existing record: only fill what is missing (this used to overwrite the
    // cohort and institution), and mark consent — these addresses come from an
    // opted-in mailing list — unless she has unsubscribed since.
    const patch: Record<string, unknown> = {};
    for (const key of ["first_name", "last_name", "phone", "city", "institution", "cohort_year"] as const) {
      if ((row[key] == null || row[key] === "") && rec[key] != null) patch[key] = rec[key];
    }
    if (!row.consent_marketing && !row.unsubscribed_at) {
      patch.consent_marketing = true;
      patch.consent_at = now;
    }
    if (Object.keys(patch).length) {
      const { error } = await admin.from("candidates").update(patch).eq("id", row.id as string);
      if (error) {
        console.error("csv merge failed:", rec.email, error);
        skipped++;
        continue;
      }
    }
    merged++;
  }

  const toRow = (rec: Rec) => ({
    ...rec,
    source: "import_csv",
    status: "active",
    consent_marketing: true,
    consent_at: now,
  });
  for (let i = 0; i < inserts.length; i += 500) {
    const chunk = inserts.slice(i, i + 500);
    const { error } = await admin.from("candidates").insert(chunk.map(toRow));
    if (!error) {
      created += chunk.length;
      continue;
    }
    // One bad row fails the whole chunk; fall back to one at a time for it.
    for (const rec of chunk) {
      const { error: rowErr } = await admin.from("candidates").insert(toRow(rec));
      if (rowErr) {
        console.error("csv row failed:", rec.email, rowErr);
        skipped++;
      } else created++;
    }
  }

  return NextResponse.json({ ok: true, created, merged, skipped, total: rows.length - 1 });
}
