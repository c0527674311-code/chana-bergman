import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { mergePatch } from "@/lib/candidate-merge";
import { rateLimited } from "@/lib/rate-limit";
import { normalizeEmail, normalizePhone, storageKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Under the 4.5MB request limit of the host. */
const MAX_PDF_BYTES = 4 * 1024 * 1024;

/**
 * A CV built on /cv-builder also joins Chana's pool.
 *
 * Someone who writes her whole CV on the site is a candidate; until now that
 * work left no trace and she had to fill the submission form all over again.
 * The text of the CV is stored as her document, so a search for anything in it
 * finds her.
 *
 * Mailing consent is separate and is the visitor's own act (the checkbox next
 * to the download button) — the same rule as the CV submission form.
 */

type Entry = Record<string, unknown>;

function line(...parts: (string | null | undefined)[]) {
  return parts.filter((p) => p && String(p).trim()).join(" · ");
}

function cvToText(cv: Record<string, unknown>): string {
  const str = (v: unknown) => String(v ?? "").trim();
  const experience = Array.isArray(cv.experience) ? (cv.experience as Entry[]) : [];
  const education = Array.isArray(cv.education) ? (cv.education as Entry[]) : [];
  return [
    str(cv.fullName),
    str(cv.title),
    line(str(cv.email), str(cv.phone), str(cv.city)),
    str(cv.summary) && `\nתמצית:\n${str(cv.summary)}`,
    experience.length && "\nניסיון תעסוקתי:",
    ...experience.map((e) =>
      line(str(e.role), str(e.company), line(str(e.from), str(e.to))) +
      (str(e.description) ? `\n${str(e.description)}` : ""),
    ),
    education.length && "\nהשכלה:",
    ...education.map((e) => line(str(e.degree), str(e.institution), str(e.year))),
    str(cv.skills) && `\nכישורים טכניים:\n${str(cv.skills)}`,
    str(cv.languages) && `\nשפות:\n${str(cv.languages)}`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  // The page sends the CV as JSON plus the PDF it just made (multipart); a
  // plain JSON body, without a file, is still accepted.
  let body: Record<string, unknown> | null = null;
  let pdf: Buffer | null = null;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (form) {
      try {
        body = {
          cv: JSON.parse(String(form.get("cv") ?? "null")),
          consent: form.get("consent") === "true",
          company_website: form.get("company_website") ?? "",
        };
      } catch {
        body = null;
      }
      const file = form.get("pdf");
      if (file instanceof File && file.size > 0 && file.size <= MAX_PDF_BYTES) {
        const bytes = Buffer.from(await file.arrayBuffer());
        // A real PDF starts with "%PDF"; anything else is not stored as one.
        if (bytes.subarray(0, 4).toString("latin1") === "%PDF") pdf = bytes;
      }
    }
  } else {
    body = await request.json().catch(() => null);
  }
  const cv = (body?.cv ?? null) as Record<string, unknown> | null;
  if (!cv) return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });

  // Bots fill every field; people never see this one.
  if (String(body?.company_website ?? "").trim()) return NextResponse.json({ ok: true });
  if (rateLimited(request, "cv-builder-save", 10, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי שמירות בזמן קצר." }, { status: 429 });
  }

  const fullName = String(cv.fullName ?? "").trim().slice(0, 120);
  const email = normalizeEmail(String(cv.email ?? "").slice(0, 200));
  const phoneRaw = String(cv.phone ?? "").trim().slice(0, 40);
  const consent = body?.consent === true;

  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
  const validPhone = normalizePhone(phoneRaw) ? phoneRaw : null;
  // Without a name and a way to reach her there is no candidate to save.
  if (!fullName || (!validEmail && !validPhone)) {
    return NextResponse.json({ ok: false, skipped: true });
  }
  if (!adminConfigured()) return NextResponse.json({ ok: false, skipped: true });

  const [first, ...rest] = fullName.split(/\s+/);
  const fields = {
    first_name: first,
    last_name: rest.join(" ") || null,
    email: validEmail,
    phone: validPhone,
    city: String(cv.city ?? "").trim().slice(0, 80) || null,
    notes_from_candidate: String(cv.summary ?? "").trim().slice(0, 2000) || null,
  };

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: matchId, error: matchErr } = await admin.rpc("find_candidate_match", {
      p_email: validEmail,
      p_phone: validPhone,
    });
    if (matchErr) throw matchErr;
    let candidateId = (matchId as string | null) ?? null;

    if (candidateId) {
      const { data: existing, error } = await admin
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();
      if (error) throw error;
      // Only adds — the same rule as the submission form for someone who is
      // not signed in as this candidate.
      const patch = mergePatch(existing, fields);
      if (consent && !existing.consent_marketing && !existing.unsubscribed_at) {
        patch.consent_marketing = true;
        patch.consent_at = now;
      }
      if (Object.keys(patch).length) {
        const { error: upErr } = await admin.from("candidates").update(patch).eq("id", candidateId);
        if (upErr) throw upErr;
      }
    } else {
      const { data, error } = await admin
        .from("candidates")
        .insert({
          ...fields,
          source: "site",
          status: "active",
          consent_marketing: consent,
          consent_at: consent ? now : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      candidateId = data.id as string;
    }

    // The CV itself. The PDF she downloaded is the document Chana opens; the
    // text of the CV rides along as its extracted text, so every word in it is
    // searchable. Without a PDF the text is stored as a file of its own.
    const text = cvToText(cv);
    if (text || pdf) {
      const asPdf = pdf != null;
      const bytes = pdf ?? Buffer.from(text, "utf8");
      const path = `${candidateId}/${Date.now()}-${storageKey(asPdf ? "cv-builder.pdf" : "cv-builder.txt")}`;
      const { error: upErr } = await admin.storage
        .from("cvs")
        .upload(path, bytes, { contentType: asPdf ? "application/pdf" : "text/plain", upsert: false });
      if (upErr) throw upErr;

      const { data: versions } = await admin
        .from("cv_documents")
        .select("version, is_current")
        .eq("candidate_id", candidateId)
        .order("version", { ascending: false });
      // A CV she uploaded herself stays the current one.
      const isCurrent = !versions?.some((v) => v.is_current);

      const { error: docErr } = await admin.from("cv_documents").insert({
        candidate_id: candidateId,
        storage_path: path,
        file_name: asPdf ? "קורות חיים שנבנו באתר.pdf" : "קורות חיים שנבנו באתר.txt",
        mime_type: asPdf ? "application/pdf" : "text/plain",
        size_bytes: bytes.byteLength,
        version: (versions?.[0]?.version ?? 0) + 1,
        is_current: isCurrent,
        source: "site",
        extracted_text: text,
        parse_status: "parsed",
        parsed_at: now,
      });
      if (docErr) throw docErr;
    }

    await admin.from("activity_log").insert({
      candidate_id: candidateId,
      kind: "cv_builder_saved",
      detail: { consent },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never block the download over this.
    console.error("cv-builder save failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
