import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { MAX_PARSE_BYTES, parseCv, parserConfigured } from "@/lib/cv-parser";
import { classifyFromPath } from "@/lib/folder-classification";
import { normalizeEmail } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Bulk-import a single CV file. The browser calls this once per file with a
 * small concurrency window, so a whole folder can be imported unattended.
 */
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
  if (file.size > MAX_PARSE_BYTES) {
    return NextResponse.json({ error: "הקובץ גדול מדי." }, { status: 400 });
  }

  const relativePath = String(form?.get("relativePath") ?? "");
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();

  try {
    // 1. Parse (when a key is configured). Without one the file is still
    //    stored and queued, so nothing is lost — it just needs a later pass.
    let parsed = null;
    let extractedText: string | null = null;
    let parseError: string | null = null;

    if (parserConfigured()) {
      try {
        const result = await parseCv(buffer, file.type || "", file.name);
        parsed = result.parsed;
        extractedText = result.extractedText;
      } catch (err) {
        parseError = err instanceof Error ? err.message : "ניתוח נכשל";
      }
    } else {
      parseError = "ANTHROPIC_API_KEY לא מוגדר";
    }

    // 2. Dedup on the parsed identity.
    const email = normalizeEmail(parsed?.email);
    const phone = parsed?.phone ?? null;
    let candidateId: string | null = null;
    let merged = false;

    if (email || phone) {
      const { data: matchId } = await admin.rpc("find_candidate_match", {
        p_email: email,
        p_phone: phone,
      });
      candidateId = (matchId as string | null) ?? null;
      merged = Boolean(candidateId);
    }

    // Chana's folder names are a classification she curated by hand —
    // `מעל 5 שנים/ג'אווה/...` says both the field and the experience band. It is
    // frequently better than the CV: a CV seldom states "5+ years" outright, but
    // she filed it there because she knows. Union it with what the scan found;
    // for experience the folder wins, since that is her own judgement.
    const fromFolder = classifyFromPath(relativePath);
    const union = (a: string[] | undefined, b: string[]) => [...new Set([...(a ?? []), ...b])];

    const fields = {
      first_name: parsed?.first_name ?? null,
      last_name: parsed?.last_name ?? null,
      email,
      phone,
      city: parsed?.city ?? null,
      preferred_regions: parsed?.preferred_region ? [parsed.preferred_region] : null,
      programming_languages: union(parsed?.programming_languages, fromFolder.programmingLanguages),
      technologies: union(parsed?.technologies, fromFolder.technologies),
      spoken_languages: parsed?.spoken_languages ?? [],
      role_types: parsed?.role_types ?? [],
      experience_years: fromFolder.experienceYears ?? parsed?.experience_years ?? null,
      seniority: parsed?.seniority ?? null,
      institution: parsed?.institution ?? null,
      cohort_year: parsed?.cohort_year ?? null,
      notes_internal: parsed?.summary ?? null,
      // Keep the folder names verbatim too, so a heading we could not map to the
      // vocabulary is still searchable rather than silently dropped.
      tags: fromFolder.tags,
    };

    if (candidateId) {
      // Only fill blanks on merge — never overwrite data Chana curated by hand.
      const { data: existing } = await admin
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        const current = (existing as Record<string, unknown>)?.[key];
        const currentEmpty =
          current == null || current === "" || (Array.isArray(current) && current.length === 0);
        const valuePresent =
          value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
        if (currentEmpty && valuePresent) patch[key] = value;
      }
      if (Object.keys(patch).length) {
        await admin.from("candidates").update(patch).eq("id", candidateId);
      }
    } else {
      const { data, error } = await admin
        .from("candidates")
        .insert({ ...fields, source: "import_disk", status: "active", consent_marketing: false })
        .select("id")
        .single();
      if (error) throw error;
      candidateId = data.id;
    }

    // 3. Store the original file as a new version. Originals are never deleted.
    const safeName = file.name.replace(/[^\w.\-֐-׿]/g, "_");
    const path = `${candidateId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await admin.storage
      .from("cvs")
      .upload(path, buffer, { contentType: file.type || undefined, upsert: false });
    if (upErr) throw upErr;

    const { data: last } = await admin
      .from("cv_documents")
      .select("version")
      .eq("candidate_id", candidateId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    await admin.from("cv_documents").update({ is_current: false }).eq("candidate_id", candidateId);

    await admin.from("cv_documents").insert({
      candidate_id: candidateId,
      storage_path: path,
      file_name: relativePath || file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      version: (last?.version ?? 0) + 1,
      is_current: true,
      source: "import_disk",
      extracted_text: extractedText,
      parse_status: parseError
        ? "failed"
        : parsed?.confidence === "low"
          ? "needs_review"
          : "parsed",
      parse_error: parseError,
      parsed_at: parsed ? new Date().toISOString() : null,
    });

    return NextResponse.json({
      ok: true,
      candidateId,
      merged,
      needsReview: parsed?.confidence === "low" || Boolean(parseError),
      // The row is written either way — a file is never dropped. But when the
      // scan failed the row is *empty*, and reporting that as "נקלט" told Chana
      // a folder had imported cleanly while it produced blank records.
      parsed: Boolean(parsed),
      parseError,
    });
  } catch (err) {
    console.error("cv import failed:", file.name, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "הייבוא נכשל." },
      { status: 500 },
    );
  }
}
