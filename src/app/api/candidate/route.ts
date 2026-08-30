import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { saveDevSubmission } from "@/lib/dev-fallback";
import { normalizeEmail, normalizePhone } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_CV_BYTES = 15 * 1024 * 1024;

/** Multi-select fields arrive as repeated form entries; store them as arrays. */
function arrayField(form: FormData, key: string): string[] {
  return form
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const mode = String(form.get("mode") ?? "submit");
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

  const cv = form.get("cv");
  const cvFile = cv instanceof File && cv.size > 0 ? cv : null;
  if (cvFile && cvFile.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: "הקובץ גדול מדי (עד 15MB)." }, { status: 400 });
  }
  // A voice recording is a full substitute for an uploaded file.
  const voiceTranscript = String(form.get("voice_transcript") ?? "").trim().slice(0, 20_000);
  if (mode === "submit" && !cvFile && !voiceTranscript) {
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
    preferred_region: String(form.get("preferred_region") ?? "").trim() || null,
    spoken_languages: arrayField(form, "spoken_languages"),
    programming_languages: arrayField(form, "programming_languages"),
    technologies: arrayField(form, "technologies"),
    experience_years: String(form.get("experience_years") ?? "").trim() || null,
    notes_from_candidate: String(form.get("notes_from_candidate") ?? "").trim() || null,
    contact_before_sending: form.get("contact_before_sending") === "yes",
    consent_marketing: form.get("consent_marketing") != null,
  };

  if (!adminConfigured()) {
    const saved = await saveDevSubmission("candidate", {
      ...fields,
      cv: cvFile?.name ?? null,
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

    // If a candidate is editing her own profile, scope the write to her row.
    let candidateId: string | null = null;
    if (mode === "edit" && supabaseConfigured) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
      const { data: own } = await admin
        .from("candidates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      candidateId = own?.id ?? null;
    }

    // Dedup: email first, then phone. Never create a second row for the same person.
    if (!candidateId) {
      const { data: matchId } = await admin.rpc("find_candidate_match", {
        p_email: email,
        p_phone: phoneRaw || null,
      });
      candidateId = (matchId as string | null) ?? null;
    }

    if (candidateId) {
      const { error } = await admin
        .from("candidates")
        .update({ ...fields, consent_at: fields.consent_marketing ? new Date().toISOString() : null })
        .eq("id", candidateId);
      if (error) throw error;
    } else {
      const { data, error } = await admin
        .from("candidates")
        .insert({
          ...fields,
          source: "site",
          consent_at: fields.consent_marketing ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      candidateId = data.id;
    }

    // Store the CV as a NEW version — never overwrite an earlier file. When
    // the candidate recorded instead of uploading, the transcript itself is
    // the document, so Chana always has something to open.
    const doc = cvFile
      ? {
          bytes: Buffer.from(await cvFile.arrayBuffer()),
          fileName: cvFile.name,
          mime: cvFile.type || null,
          extractedText: null as string | null,
        }
      : voiceTranscript
        ? {
            bytes: Buffer.from(`תמלול הקלטה קולית:\n\n${voiceTranscript}`, "utf8"),
            fileName: "הקלטה קולית (תמלול).txt",
            mime: "text/plain",
            extractedText: voiceTranscript,
          }
        : null;

    if (doc && candidateId) {
      const safeName = doc.fileName.replace(/[^\w.\-֐-׿]/g, "_");
      const path = `${candidateId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await admin.storage
        .from("cvs")
        .upload(path, doc.bytes, { contentType: doc.mime ?? undefined, upsert: false });
      if (upErr) throw upErr;

      const { data: last } = await admin
        .from("cv_documents")
        .select("version")
        .eq("candidate_id", candidateId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      // The one-current-per-candidate index requires clearing the old flag first.
      await admin.from("cv_documents").update({ is_current: false }).eq("candidate_id", candidateId);

      const { error: docErr } = await admin.from("cv_documents").insert({
        candidate_id: candidateId,
        storage_path: path,
        file_name: doc.fileName,
        mime_type: doc.mime,
        size_bytes: doc.bytes.length,
        version: (last?.version ?? 0) + 1,
        is_current: true,
        source: "site",
        extracted_text: doc.extractedText,
        parse_status: doc.extractedText ? "parsed" : "pending",
      });
      if (docErr) throw docErr;
    }

    await admin.from("activity_log").insert({
      candidate_id: candidateId,
      kind: mode === "edit" ? "profile_updated" : "cv_submitted",
      detail: { has_cv: Boolean(cvFile), has_voice: Boolean(voiceTranscript && !cvFile) },
    });

    return NextResponse.json({ ok: true, candidateId });
  } catch (err) {
    console.error("candidate submit failed:", err);
    return NextResponse.json(
      { error: "השמירה נכשלה. נסי שוב, או שלחי לנו את קורות החיים במייל." },
      { status: 500 },
    );
  }
}
