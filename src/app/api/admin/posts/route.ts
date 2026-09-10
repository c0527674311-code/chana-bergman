import { revalidatePath } from "next/cache";
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

/** 23505 = unique_violation on the slug column. */
function slugTaken(error: unknown) {
  return (error as { code?: string } | null)?.code === "23505";
}

const SLUG_TAKEN = "כבר קיים פוסט עם הכתובת הזו. שני את הכותרת או את הכתובת.";

/**
 * The blog pages are cached (ISR). Mark the index, the sitemap and the post —
 * plus its old address when the slug changed — for a fresh render on the
 * next visit, so an edit shows up immediately instead of up to an hour later.
 */
function revalidateBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${slug}`);
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
  };
  const now = new Date().toISOString();

  try {
    const admin = createAdminClient();

    if (body.id) {
      const { data: existing, error: readError } = await admin
        .from("posts")
        .select("slug, published_at")
        .eq("id", body.id)
        .maybeSingle<{ slug: string; published_at: string | null }>();
      if (readError) throw readError;
      if (!existing) return NextResponse.json({ error: "הפוסט לא נמצא." }, { status: 404 });

      // The publish date is stamped once, the first time the post goes live.
      // Saving a fix later (or unpublishing and republishing) keeps it, instead
      // of re-dating the article and bumping it to the top of the blog.
      const published_at = existing.published_at ?? (record.published ? now : null);

      const { error } = await admin
        .from("posts")
        .update({ ...record, published_at })
        .eq("id", body.id);
      if (error) {
        if (slugTaken(error)) return NextResponse.json({ error: SLUG_TAKEN }, { status: 409 });
        throw error;
      }
      revalidateBlog(record.slug, existing.slug);
      return NextResponse.json({ ok: true, id: body.id, slug: record.slug });
    }

    const { data, error } = await admin
      .from("posts")
      .insert({ ...record, published_at: record.published ? now : null })
      .select("id")
      .single();
    if (error) {
      if (slugTaken(error)) return NextResponse.json({ error: SLUG_TAKEN }, { status: 409 });
      throw error;
    }
    revalidateBlog(record.slug);
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
    const { data: deleted, error } = await admin
      .from("posts")
      .delete()
      .eq("id", id)
      .select("slug")
      .maybeSingle<{ slug: string }>();
    if (error) throw error;
    revalidateBlog(deleted?.slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("post delete failed:", err);
    return NextResponse.json({ error: "המחיקה נכשלה." }, { status: 500 });
  }
}
