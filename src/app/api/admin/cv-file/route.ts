import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A candidate's current CV, served from this site.
 *
 * The signed links pointed straight at supabase.co, and Chana's filtered
 * internet (NetFree) blocks that host — so she could see a match and not open
 * her CV. The file now comes through chana-bergman.co.il, which is allowed,
 * and the link no longer expires after an hour.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("candidate") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("cv_documents")
    .select("storage_path, file_name, mime_type")
    .eq("candidate_id", id)
    .eq("is_current", true)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "אין קובץ קורות חיים למועמדת הזו." }, { status: 404 });

  const { data: blob, error } = await admin.storage.from("cvs").download(doc.storage_path);
  if (error || !blob) {
    console.error("cv download failed:", doc.storage_path, error);
    return NextResponse.json({ error: "הקובץ לא נמצא באחסון." }, { status: 404 });
  }

  const name = (doc.file_name.split("/").pop() ?? "cv").replace(/["\\]/g, "");
  return new NextResponse(Buffer.from(await blob.arrayBuffer()), {
    headers: {
      "Content-Type": doc.mime_type ?? "application/octet-stream",
      // inline: it opens in the browser tab, which is how she reads them.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
