import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail, normalizePhone } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Minimal RFC-4180 parser — handles quoted fields containing commas and newlines. */
function parseCsv(text: string): string[][] {
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
    else if (ch === ",") {
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
  if (/mail|מייל|דוא"?ל|אימייל/.test(h)) return "email";
  if (/phone|mobile|cell|טלפון|נייד|פלאפון/.test(h)) return "phone";
  if (/first ?name|שם פרטי|firstname/.test(h)) return "first_name";
  if (/last ?name|family|שם משפחה|lastname/.test(h)) return "last_name";
  if (/^(full ?name|name|שם|שם מלא)$/.test(h)) return "full_name";
  if (/שנתון|cohort|year|מחזור/.test(h)) return "cohort_year";
  if (/city|עיר|יישוב|ישוב/.test(h)) return "city";
  if (/מוסד|סמינר|institution|school/.test(h)) return "institution";
  return null;
}

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

  // Strip the UTF-8 BOM Excel writes, or the first header won't match.
  const text = (await file.text()).replace(/^﻿/, "");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "הקובץ ריק או חסר שורת כותרות." }, { status: 400 });
  }

  const headers = rows[0].map(classifyHeader);
  if (!headers.includes("email")) {
    return NextResponse.json(
      { error: "לא נמצאה עמודת מייל בקובץ. ודאי שיש כותרת כמו 'email' או 'מייל'." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  let created = 0;
  let merged = 0;
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const rec: Record<string, string> = {};
    headers.forEach((key, i) => {
      if (key && row[i]) rec[key] = row[i].trim();
    });

    if (rec.full_name && !rec.first_name) {
      const parts = rec.full_name.split(/\s+/);
      rec.first_name = parts[0];
      rec.last_name = parts.slice(1).join(" ");
    }

    const email = normalizeEmail(rec.email);
    const phone = rec.phone || null;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      skipped++;
      continue;
    }

    const cohort = rec.cohort_year?.match(/(20\d{2})/)?.[1];

    try {
      const { data: matchId } = await admin.rpc("find_candidate_match", {
        p_email: email,
        p_phone: phone,
      });

      if (matchId) {
        // Existing record: only add the cohort/institution if missing, and mark
        // consent — these addresses come from an opted-in mailing list.
        const patch: Record<string, unknown> = { consent_marketing: true };
        if (cohort) patch.cohort_year = Number(cohort);
        if (rec.institution) patch.institution = rec.institution;
        await admin.from("candidates").update(patch).eq("id", matchId as string);
        merged++;
      } else {
        const { error } = await admin.from("candidates").insert({
          first_name: rec.first_name || null,
          last_name: rec.last_name || null,
          email,
          phone,
          city: rec.city || null,
          institution: rec.institution || null,
          cohort_year: cohort ? Number(cohort) : null,
          source: "import_csv",
          status: "active",
          consent_marketing: true,
          consent_at: new Date().toISOString(),
        });
        if (error) throw error;
        created++;
      }
    } catch (err) {
      console.error("csv row failed:", email, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, created, merged, skipped, total: rows.length - 1 });
}
