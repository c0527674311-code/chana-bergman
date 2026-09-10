import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { describeParseError, parseCv, parserConfigured } from "@/lib/cv-parser";
import { isJunkFile } from "@/lib/cv-text";
import { fieldsFromParsed, mergePatch } from "@/lib/candidate-merge";
import { discardIncoming, isIncomingPath, moveIncoming, readIncoming } from "@/lib/incoming";
import { storageKey } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Bulk-import a single CV file. The browser uploads the file to Storage first
 * (lib/incoming.ts), then calls this once per file with a small concurrency
 * window, so a whole folder can be imported unattended.
 *
 * A file that can't be read no longer becomes a candidate. The old route
 * inserted a row with no name, email or phone for every failure — including
 * Word's `~$` lock files — and nothing ever filled those rows in. The failure
 * is reported back instead, and the file is still on Chana's computer.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר.", fatal: true }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const path = body?.path;
  if (!isIncomingPath(path)) {
    return NextResponse.json({ error: "לא התקבל קובץ." }, { status: 400 });
  }
  const fileName = String(body?.fileName ?? "").slice(0, 300) || "cv";
  const relativePath = String(body?.relativePath ?? "").slice(0, 500);
  const mime = String(body?.mime ?? "").slice(0, 120) || null;

  const admin = createAdminClient();
  const discard = () => discardIncoming(admin, "cvs", path);

  let buffer: Buffer;
  try {
    buffer = await readIncoming(admin, "cvs", path);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "הקובץ לא נמצא.", retryable: true },
      { status: 400 },
    );
  }

  if (isJunkFile(fileName, buffer.length)) {
    await discard();
    return NextResponse.json({ ok: true, skipped: true, reason: "קובץ זמני של Word — לא קורות חיים" });
  }

  // The same file again (a folder imported twice) costs nothing and adds nothing.
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const { data: dup } = await admin
    .from("cv_documents")
    .select("candidate_id")
    .eq("content_sha256", sha256)
    .limit(1)
    .maybeSingle();
  if (dup) {
    await discard();
    return NextResponse.json({ ok: true, duplicate: true, candidateId: dup.candidate_id });
  }

  if (!parserConfigured()) {
    await discard();
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY לא מוגדר — אי אפשר לקרוא קורות חיים.", fatal: true },
      { status: 503 },
    );
  }

  let parsed;
  let extractedText: string | null;
  try {
    ({ parsed, extractedText } = await parseCv(buffer, fileName));
  } catch (err) {
    const reason = describeParseError(err);
    console.error("cv import parse failed:", relativePath || fileName, err);
    await discard();
    return NextResponse.json(
      { error: reason.message, retryable: reason.retryable, fatal: reason.fatal },
      { status: 422 },
    );
  }

  try {
    const fields = fieldsFromParsed(parsed, relativePath);
    let candidateId: string | null = null;
    let merged = false;

    if (fields.email || fields.phone) {
      const { data: matchId, error } = await admin.rpc("find_candidate_match", {
        p_email: fields.email,
        p_phone: fields.phone,
      });
      if (error) throw error;
      candidateId = (matchId as string | null) ?? null;
      merged = Boolean(candidateId);
    }

    if (candidateId) {
      const { data: existing, error } = await admin
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();
      if (error) throw error;
      const patch = mergePatch(existing, fields);
      if (Object.keys(patch).length) {
        const { error: upErr } = await admin.from("candidates").update(patch).eq("id", candidateId);
        if (upErr) throw upErr;
      }
    } else {
      const { data, error } = await admin
        .from("candidates")
        .insert({ ...fields, source: "import_disk", status: "active", consent_marketing: false })
        .select("id")
        .single();
      if (error) throw error;
      candidateId = data.id as string;
    }

    // Store the original as a new version. Originals are never deleted.
    const finalPath = `${candidateId}/${Date.now()}-${storageKey(fileName)}`;
    await moveIncoming(admin, "cvs", path, finalPath);

    const { data: versions, error: vErr } = await admin
      .from("cv_documents")
      .select("id, version, is_current, source")
      .eq("candidate_id", candidateId)
      .order("version", { ascending: false });
    if (vErr) throw vErr;

    // An old CV from the archive must not replace one she sent herself on the site.
    const current = versions?.find((v) => v.is_current);
    const makeCurrent = !current || current.source !== "site";
    if (makeCurrent && current) {
      const { error } = await admin.from("cv_documents").update({ is_current: false }).eq("id", current.id);
      if (error) throw error;
    }

    const { error: docErr } = await admin.from("cv_documents").insert({
      candidate_id: candidateId,
      storage_path: finalPath,
      file_name: relativePath || fileName,
      mime_type: mime,
      size_bytes: buffer.length,
      version: (versions?.[0]?.version ?? 0) + 1,
      is_current: makeCurrent,
      source: "import_disk",
      extracted_text: extractedText,
      content_sha256: sha256,
      parse_status: parsed.confidence === "low" ? "needs_review" : "parsed",
      parsed_at: new Date().toISOString(),
    });
    if (docErr) throw docErr;

    return NextResponse.json({
      ok: true,
      candidateId,
      merged,
      needsReview: parsed.confidence === "low",
      named: Boolean(fields.first_name),
    });
  } catch (err) {
    console.error("cv import failed:", relativePath || fileName, err);
    return NextResponse.json(
      { error: "השמירה נכשלה. אפשר לנסות שוב.", retryable: true },
      { status: 500 },
    );
  }
}
