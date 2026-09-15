import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { saveDevSubmission } from "@/lib/dev-fallback";
import { detectFormat, extractText } from "@/lib/cv-text";
import { isIncomingPath, moveIncoming, readIncoming } from "@/lib/incoming";
import { rateLimited } from "@/lib/rate-limit";
import { formatDate, normalizeEmail, normalizePhone, storageKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CV_BYTES = 15 * 1024 * 1024;

const LIST_FIELDS = [
  "preferred_regions",
  "spoken_languages",
  "programming_languages",
  "technologies",
] as const;

/** Multi-select fields arrive as repeated form entries; store them as arrays. */
function arrayField(form: FormData, key: string): string[] {
  return form
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

/** The signed-in user, with her email only when the provider verified it. */
async function sessionUser() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email_confirmed_at ? normalizeEmail(user.email) : null };
}

/**
 * Two ways in, with different trust.
 *
 * - Her own record — linked to her account, or carrying the address her
 *   account verified — is updated with exactly what she sent.
 * - Anyone else who submits the email or phone of an existing candidate only
 *   adds to that record. This endpoint used to overwrite the name, email,
 *   phone, CV and every list of whichever record matched, for anyone who knew
 *   an address; and edit mode fell back to the same match when the account
 *   had no linked row.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  // Bots fill every field; people never see this one.
  if (String(form.get("company_website") ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const mode = String(form.get("mode") ?? "submit");
  if (mode !== "submit" && mode !== "edit") {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }
  if (mode === "submit" && rateLimited(request, "candidate", 10, 10 * 60_000)) {
    return NextResponse.json({ error: "יותר מדי שליחות בזמן קצר. נסי שוב בעוד כמה דקות." }, { status: 429 });
  }

  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const phoneRaw = String(form.get("phone") ?? "").trim();

  if (!firstName) return NextResponse.json({ error: "נא למלא שם פרטי." }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "כתובת המייל אינה תקינה." }, { status: 400 });
  }
  if (phoneRaw && !normalizePhone(phoneRaw)) {
    return NextResponse.json({ error: "מספר הטלפון אינו תקין." }, { status: 400 });
  }

  // The file was uploaded straight to Storage by the browser; only its path
  // arrives here. A small file may still come attached (local demo mode).
  const cvPath = form.get("cv_path");
  if (cvPath != null && cvPath !== "" && !isIncomingPath(cvPath)) {
    return NextResponse.json({ error: "הקובץ לא נמצא. נסי להעלות אותו שוב." }, { status: 400 });
  }
  const uploadedPath = isIncomingPath(cvPath) ? cvPath : null;
  const uploadedName = String(form.get("cv_name") ?? "").trim().slice(0, 200);
  const uploadedType = String(form.get("cv_type") ?? "").trim().slice(0, 120) || null;

  const cv = form.get("cv");
  const cvFile = !uploadedPath && cv instanceof File && cv.size > 0 ? cv : null;
  if (cvFile && cvFile.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: "הקובץ גדול מדי (עד 15MB)." }, { status: 400 });
  }
  // Joining the pool means agreeing to hear about jobs — that is the service.
  // The checkbox is `required` in the form, but a request can skip the form.
  if (mode === "submit" && form.get("consent_marketing") == null) {
    return NextResponse.json(
      { error: "כדי להצטרף למאגר יש לאשר קבלת עדכונים על משרות במייל." },
      { status: 400 },
    );
  }

  // A voice recording is a full substitute for an uploaded file.
  const voiceTranscript = String(form.get("voice_transcript") ?? "").trim().slice(0, 20_000);
  if (mode === "submit" && !uploadedPath && !cvFile && !voiceTranscript) {
    return NextResponse.json(
      { error: "נא לצרף קובץ קורות חיים או להקליט את הפרטים." },
      { status: 400 },
    );
  }

  const fields = {
    first_name: firstName,
    last_name: lastName || null,
    email,
    phone: phoneRaw || null,
    city: String(form.get("city") ?? "").trim() || null,
    preferred_regions: arrayField(form, "preferred_regions"),
    spoken_languages: arrayField(form, "spoken_languages"),
    programming_languages: arrayField(form, "programming_languages"),
    technologies: arrayField(form, "technologies"),
    experience_years: String(form.get("experience_years") ?? "").trim() || null,
    notes_from_candidate: String(form.get("notes_from_candidate") ?? "").trim() || null,
    contact_before_sending: form.get("contact_before_sending") === "yes",
    diversitech_practicum: form.get("diversitech_practicum") != null,
  };

  if (!adminConfigured()) {
    const saved = await saveDevSubmission("candidate", {
      ...fields,
      consent_marketing: mode === "submit",
      cv: cvFile?.name ?? uploadedName ?? null,
      voice: voiceTranscript ? voiceTranscript.slice(0, 200) : null,
      mode,
    });
    if (saved) return NextResponse.json({ ok: true, dev: true });
    return NextResponse.json(
      { error: "המערכת עדיין לא חוברה למסד הנתונים. אנא שלחי לנו מייל." },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const user = await sessionUser();
    const now = new Date().toISOString();

    if (mode === "edit" && !user) {
      return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
    }

    const own = user ? await ownRecord(admin, user) : null;

    let candidateId: string | null = null;
    let verified = false;

    if (mode === "edit") {
      if (!own) {
        return NextResponse.json(
          {
            error:
              "לא מצאנו פרופיל שמחובר לחשבון הזה. אם נרשמת בעבר עם כתובת מייל אחרת, אפשר לשלוח קורות חיים מחדש.",
          },
          { status: 404 },
        );
      }
      candidateId = own.id;
      verified = true;
    } else if (own && (own.email_key === email || user?.email === email)) {
      // Signed in and sending her own details. (Signed in as someone else —
      // e.g. Chana filling the form for a candidate — falls through to the
      // ordinary match below and cannot touch Chana's own record.)
      candidateId = own.id;
      verified = true;
    } else {
      candidateId = await matchCandidate(admin, email, phoneRaw);
    }

    if (candidateId && verified) {
      const patch =
        mode === "submit" ? { ...fields, consent_marketing: true, unsubscribed_at: null } : fields;
      const { error } = await admin.from("candidates").update(patch).eq("id", candidateId);
      if (error?.code === "23505") {
        return NextResponse.json(
          { error: "כתובת המייל הזו כבר רשומה אצלנו בפרופיל אחר. כתבי לנו ונחבר ביניהם." },
          { status: 409 },
        );
      }
      if (error) throw error;
    } else if (candidateId) {
      await addToExisting(admin, candidateId, fields, now);
    } else {
      const { data, error } = await admin
        .from("candidates")
        .insert({
          ...fields,
          // Her own account, submitting her own address, owns the new record.
          user_id: user && !own && user.email === email ? user.id : null,
          source: "site",
          consent_marketing: true,
          consent_at: now,
        })
        .select("id")
        .single();
      if (error?.code === "23505") {
        // The same address was saved a moment ago (a double click, two tabs).
        candidateId = await matchCandidate(admin, email, phoneRaw);
        if (!candidateId) throw error;
        await addToExisting(admin, candidateId, fields, now);
      } else if (error) {
        throw error;
      } else {
        candidateId = data.id as string;
      }
    }

    if (mode === "submit") {
      // Keep the date she first agreed; only fill it when it was never set.
      await admin.from("candidates").update({ consent_at: now }).eq("id", candidateId).is("consent_at", null);
    }

    // Store the CV as a NEW version — never overwrite an earlier file. When
    // the candidate recorded instead of uploading, the transcript itself is
    // the document, so Chana always has something to open.
    const doc = uploadedPath
      ? await (async () => {
          const bytes = await readIncoming(admin, "cvs", uploadedPath);
          const fileName = uploadedName || uploadedPath.split("/").pop()!;
          const path = `${candidateId}/${Date.now()}-${storageKey(fileName)}`;
          await moveIncoming(admin, "cvs", uploadedPath, path);
          return { path, bytes, fileName, mime: uploadedType, uploaded: true };
        })()
      : cvFile
        ? {
            path: null,
            bytes: Buffer.from(await cvFile.arrayBuffer()),
            fileName: cvFile.name,
            mime: cvFile.type || null,
            uploaded: false,
          }
        : voiceTranscript
          ? {
              path: null,
              bytes: Buffer.from(`תמלול הקלטה קולית:\n\n${voiceTranscript}`, "utf8"),
              fileName: "הקלטה קולית (תמלול).txt",
              mime: "text/plain",
              uploaded: false,
            }
          : null;

    if (doc && candidateId) {
      let path = doc.path;
      if (!path) {
        path = `${candidateId}/${Date.now()}-${storageKey(doc.fileName)}`;
        const { error: upErr } = await admin.storage
          .from("cvs")
          .upload(path, doc.bytes, { contentType: doc.mime ?? undefined, upsert: false });
        if (upErr) throw upErr;
      }

      // The text makes her findable by anything written in the CV.
      const extractedText =
        doc.mime === "text/plain" && !doc.uploaded
          ? voiceTranscript
          : await detectFormat(doc.bytes, doc.fileName)
              .then((format) => extractText(doc.bytes, format))
              .catch(() => null);

      const { data: last } = await admin
        .from("cv_documents")
        .select("version")
        .eq("candidate_id", candidateId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      // The one-current-per-candidate index requires clearing the old flag first.
      const { error: flagErr } = await admin
        .from("cv_documents")
        .update({ is_current: false })
        .eq("candidate_id", candidateId);
      if (flagErr) throw flagErr;

      const { error: docErr } = await admin.from("cv_documents").insert({
        candidate_id: candidateId,
        storage_path: path,
        file_name: doc.fileName,
        mime_type: doc.mime,
        size_bytes: doc.bytes.length,
        version: (last?.version ?? 0) + 1,
        is_current: true,
        source: "site",
        extracted_text: extractedText,
        parse_status: extractedText ? "parsed" : "pending",
      });
      if (docErr) throw docErr;
    }

    await admin.from("activity_log").insert({
      candidate_id: candidateId,
      kind: mode === "edit" ? "profile_updated" : "cv_submitted",
      detail: {
        has_cv: Boolean(uploadedPath || cvFile),
        has_voice: Boolean(voiceTranscript && !uploadedPath && !cvFile),
        // Unverified means details were only added, never replaced.
        verified,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("candidate submit failed:", err);
    return NextResponse.json(
      { error: "השמירה נכשלה. נסי שוב, או שלחי לנו את קורות החיים במייל." },
      { status: 500 },
    );
  }
}

type Fields = {
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  preferred_regions: string[];
  spoken_languages: string[];
  programming_languages: string[];
  technologies: string[];
  experience_years: string | null;
  notes_from_candidate: string | null;
  contact_before_sending: boolean;
  diversitech_practicum: boolean;
};

/** Her record: linked to her account, or — the first time — the one with her verified address. */
async function ownRecord(admin: SupabaseClient, user: { id: string; email: string | null }) {
  const { data: linked } = await admin
    .from("candidates")
    .select("id, email_key")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (linked || !user.email) return linked;

  const { data: byEmail } = await admin
    .from("candidates")
    .select("id, email_key")
    .eq("email_key", user.email)
    .is("user_id", null)
    .is("deleted_at", null)
    .maybeSingle();
  if (!byEmail) return null;

  const { error } = await admin
    .from("candidates")
    .update({ user_id: user.id })
    .eq("id", byEmail.id)
    .is("user_id", null);
  return error ? null : byEmail;
}

async function matchCandidate(admin: SupabaseClient, email: string, phone: string) {
  const { data, error } = await admin.rpc("find_candidate_match", {
    p_email: email,
    p_phone: phone || null,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/**
 * Someone sent the email or phone of an existing candidate without being
 * signed in as her. It is almost always her — but nothing proves it, so this
 * only adds: blanks are filled, lists gain items, a new note is appended.
 */
async function addToExisting(admin: SupabaseClient, candidateId: string, fields: Fields, now: string) {
  const { data: existing, error } = await admin
    .from("candidates")
    .select(
      "first_name, last_name, email, phone, city, experience_years, notes_from_candidate, contact_before_sending, diversitech_practicum, preferred_regions, spoken_languages, programming_languages, technologies",
    )
    .eq("id", candidateId)
    .single();
  if (error) throw error;

  // Sending the form with the consent box ticked is a fresh opt-in.
  const patch: Record<string, unknown> = { consent_marketing: true, unsubscribed_at: null };

  for (const key of ["first_name", "last_name", "email", "phone", "city", "experience_years"] as const) {
    if (!existing[key] && fields[key]) patch[key] = fields[key];
  }
  for (const key of LIST_FIELDS) {
    const base: string[] = existing[key] ?? [];
    const next = [...new Set([...base, ...fields[key]])];
    if (next.length !== base.length) patch[key] = next;
  }
  const note = fields.notes_from_candidate;
  if (note && note !== existing.notes_from_candidate) {
    patch.notes_from_candidate = existing.notes_from_candidate
      ? `${existing.notes_from_candidate}\n\n— נוסף מהאתר ${formatDate(now)}:\n${note}`
      : note;
  }
  if (fields.contact_before_sending && !existing.contact_before_sending) {
    patch.contact_before_sending = true;
  }
  if (fields.diversitech_practicum && !existing.diversitech_practicum) {
    patch.diversitech_practicum = true;
  }

  const { error: upErr } = await admin.from("candidates").update(patch).eq("id", candidateId);
  if (upErr) throw upErr;
}
