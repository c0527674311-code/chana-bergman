import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The current CVs of the chosen candidates as one zip — what Chana actually
 * sends an employer after a match. Files are named after the candidate so the
 * employer sees "שרה כהן.pdf", not a storage key.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) return NextResponse.json({ error: "Supabase לא מוגדר." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const raw: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
  const ids = [...new Set(raw.map(String).filter((id) => UUID.test(id)))].slice(0, 300);
  if (!ids.length) return NextResponse.json({ error: "לא נבחרו מועמדות." }, { status: 400 });

  const admin = createAdminClient();
  const { data: candidates, error } = await admin
    .from("candidates")
    .select("id, first_name, last_name, cv_documents(storage_path, file_name, is_current)")
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const zip = new JSZip();
  const missing: string[] = [];
  const used = new Set<string>();

  for (const c of candidates ?? []) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "מועמדת";
    const doc = (c.cv_documents as { storage_path: string; file_name: string; is_current: boolean }[]).find(
      (d) => d.is_current,
    );
    if (!doc) {
      missing.push(name);
      continue;
    }
    const { data: blob, error: dlErr } = await admin.storage.from("cvs").download(doc.storage_path);
    if (dlErr || !blob) {
      missing.push(name);
      continue;
    }
    const ext = doc.file_name.match(/\.[A-Za-z0-9]{1,5}$/)?.[0] ?? "";
    let fileName = `${name.replace(/[\\/:*?"<>|]/g, " ")}${ext}`;
    for (let n = 2; used.has(fileName); n++) fileName = `${name} (${n})${ext}`;
    used.add(fileName);
    zip.file(fileName, Buffer.from(await blob.arrayBuffer()));
  }

  if (missing.length) {
    zip.file("ללא קובץ.txt", `למועמדות הבאות אין קובץ קורות חיים במערכת:\n${missing.join("\n")}\n`);
  }

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cvs-${stamp}.zip"; filename*=UTF-8''${encodeURIComponent(`קורות חיים ${stamp}.zip`)}`,
    },
  });
}
