import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { describeParseError, parseCv, parserConfigured } from "@/lib/cv-parser";
import { isJunkFile } from "@/lib/cv-text";
import { fieldsFromParsed, mergePatch } from "@/lib/candidate-merge";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Second chance for files an earlier import could not read.
 *
 * Before the import was fixed, every failure left an empty candidate behind,
 * and old .doc files were read as garbage. GET lists those documents; POST
 * re-reads one. Word lock files are hidden with the empty row they created;
 * a real CV fills its row — or, when it turns out to belong to someone already
 * in the database, moves there and the empty duplicate is hidden.
 */

type Doc = {
  id: string;
  candidate_id: string;
  storage_path: string;
  file_name: string;
  parse_status: string;
};

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) return NextResponse.json({ documents: [] });

  const { data, error } = await createAdminClient()
    .from("cv_documents")
    .select("id, file_name, parse_status, candidates!inner(deleted_at)")
    .eq("source", "import_disk")
    // A failure the current import already retried (parsed_at set), or a low
    // confidence result that was already re-read (parse_error set), is not
    // offered again — it would cost the same and end the same.
    .or("and(parse_status.eq.failed,parsed_at.is.null),and(parse_status.eq.needs_review,parse_error.is.null)")
    .is("candidates.deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    documents: (data ?? []).map((d) => ({ id: d.id, fileName: d.file_name })),
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const docId = String(body?.docId ?? "");
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: doc, error: docErr } = await admin
    .from("cv_documents")
    .select("id, candidate_id, storage_path, file_name, parse_status")
    .eq("id", docId)
    .maybeSingle<Doc>();
  if (docErr || !doc) return NextResponse.json({ error: "המסמך לא נמצא." }, { status: 404 });

  const { data: owner, error: ownerErr } = await admin
    .from("candidates")
    .select("*")
    .eq("id", doc.candidate_id)
    .single();
  if (ownerErr) return NextResponse.json({ error: ownerErr.message }, { status: 500 });

  const { data: blob, error: dlErr } = await admin.storage.from("cvs").download(doc.storage_path);
  if (dlErr || !blob) return NextResponse.json({ error: "הקובץ לא נמצא באחסון." }, { status: 404 });
  const buffer = Buffer.from(await blob.arrayBuffer());
  const baseName = doc.file_name.split("/").pop() ?? doc.file_name;

  // An empty row that exists only because of this document.
  async function hideOwnerIfEmpty() {
    const { count } = await admin
      .from("cv_documents")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", owner.id);
    if (!count && !owner.first_name && !owner.email && !owner.phone) {
      await admin.from("candidates").update({ deleted_at: now }).eq("id", owner.id);
      return true;
    }
    return false;
  }

  if (isJunkFile(baseName, buffer.length)) {
    await admin
      .from("cv_documents")
      .update({ parse_status: "failed", parse_error: "קובץ זמני של Word — לא קורות חיים", parsed_at: now })
      .eq("id", doc.id);
    const { count } = await admin
      .from("cv_documents")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", owner.id);
    const hidden = count === 1 && !owner.first_name && !owner.email && !owner.phone;
    if (hidden) await admin.from("candidates").update({ deleted_at: now }).eq("id", owner.id);
    return NextResponse.json({ ok: true, junk: true, hidden });
  }

  if (!parserConfigured()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY לא מוגדר.", fatal: true }, { status: 503 });
  }

  let parsed;
  let extractedText: string | null;
  try {
    ({ parsed, extractedText } = await parseCv(buffer, baseName));
  } catch (err) {
    const reason = describeParseError(err);
    if (!reason.retryable) {
      await admin
        .from("cv_documents")
        .update({ parse_status: "failed", parse_error: reason.message, parsed_at: now })
        .eq("id", doc.id);
    }
    return NextResponse.json({ error: reason.message, fatal: reason.fatal }, { status: 422 });
  }

  const fields = fieldsFromParsed(parsed, doc.file_name);
  let target = owner.id as string;

  // The empty row may be a copy of someone already in the database.
  if (!owner.email && !owner.phone && (fields.email || fields.phone)) {
    const { data: matchId } = await admin.rpc("find_candidate_match", {
      p_email: fields.email,
      p_phone: fields.phone,
    });
    if (matchId && matchId !== owner.id) target = matchId as string;
  }

  try {
    const { data: existing, error } =
      target === owner.id
        ? { data: owner, error: null }
        : await admin.from("candidates").select("*").eq("id", target).single();
    if (error) throw error;

    // Nobody has edited a record whose updated_at still equals created_at, so a
    // better reading may replace what the failed one wrote.
    const untouched = existing.updated_at === existing.created_at;
    const patch = mergePatch(existing, fields, { replace: untouched && target === owner.id });
    if (Object.keys(patch).length) {
      let { error: upErr } = await admin.from("candidates").update(patch).eq("id", target);
      if (upErr?.code === "23505") {
        // The address already belongs to another record — keep the rest.
        delete patch.email;
        ({ error: upErr } = await admin.from("candidates").update(patch).eq("id", target));
      }
      if (upErr) throw upErr;
    }

    const docPatch: Record<string, unknown> = {
      extracted_text: extractedText,
      content_sha256: createHash("sha256").update(buffer).digest("hex"),
      parse_status: parsed.confidence === "low" ? "needs_review" : "parsed",
      parse_error: parsed.confidence === "low" ? "נקרא שוב — כדאי לבדוק ידנית" : null,
      parsed_at: now,
    };

    if (target !== owner.id) {
      const { data: versions } = await admin
        .from("cv_documents")
        .select("version, is_current")
        .eq("candidate_id", target)
        .order("version", { ascending: false });
      docPatch.candidate_id = target;
      docPatch.version = (versions?.[0]?.version ?? 0) + 1;
      docPatch.is_current = !versions?.some((v) => v.is_current);
    }

    const { error: updErr } = await admin.from("cv_documents").update(docPatch).eq("id", doc.id);
    if (updErr) throw updErr;

    const hidden = target !== owner.id ? await hideOwnerIfEmpty() : false;
    return NextResponse.json({ ok: true, candidateId: target, merged: target !== owner.id, hidden });
  } catch (err) {
    console.error("reparse failed:", doc.id, err);
    return NextResponse.json({ error: "השמירה נכשלה." }, { status: 500 });
  }
}
