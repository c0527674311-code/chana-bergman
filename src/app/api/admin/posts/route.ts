import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Hebrew-safe slug: keeps letters/digits, collapses everything else to "-". */
function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

/** Create or update a blog post. */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "המערכת אינה מחוברת למסד הנתונים, ולכן לא ניתן לשמור פוסטים." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    slug?: string;
    excerpt?: string;
    body_md?: string;
    published?: boolean;
  };

  const title = body.title?.trim();
  const markdown = body.body_md?.trim();
  if (!title) return NextResponse.json({ error: "נא למלא כותרת." }, { status: 400 });
  if (!markdown) return NextResponse.json({ error: "נא לכתוב תוכן." }, { status: 400 });

  const record = {
    title,
    slug: body.slug?.trim() ? slugify(body.slug) : slugify(title),
    excerpt: body.excerpt?.trim() || null,
    body_md: markdown,
    published: Boolean(body.published),
    published_at: body.published ? new Date().toISOString() : null,
  };

  try {
    const admin = createAdminClient();

    if (body.id) {
      const { error } = await admin.from("posts").update(record).eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, id: body.id, slug: record.slug });
    }

    const { data, error } = await admin.from("posts").insert(record).select("id").single();
    if (error) {
      // 23505 = unique_violation on the slug column.
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "כבר קיים פוסט עם הכתובת הזו. שני את הכותרת או את הכתובת." },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json({ ok: true, id: data.id, slug: record.slug });
  } catch (err) {
    console.error("post save failed:", err);
    return NextResponse.json({ error: "השמירה נכשלה." }, { status: 500 });
  }
}

/** Delete a post. */
export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!adminConfigured()) {
    return NextResponse.json({ error: "המערכת אינה מחוברת למסד הנתונים." }, { status: 503 });
  }

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "חסר מזהה." }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("post delete failed:", err);
    return NextResponse.json({ error: "המחיקה נכשלה." }, { status: 500 });
  }
}
