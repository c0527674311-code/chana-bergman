"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/site/Markdown";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

type Draft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  published: boolean;
};

const BLANK: Draft = { title: "", slug: "", excerpt: "", body_md: "", published: true };

/** Admin rows come from `select("*")`, so they carry the `published` flag. */
type AdminPost = Post & { published?: boolean };

// published_at is kept once a post was ever live (the original date survives
// unpublishing), so the flag — not the date — says whether it is live now.
function isLive(p: AdminPost) {
  return p.published ?? Boolean(p.published_at);
}

/**
 * Blog manager for the back-office: list existing posts, write a new one, or
 * edit and delete an existing one. Live Markdown preview uses the very same
 * renderer as the public article page, so what Chana sees is what ships.
 */
export function PostEditor({ posts, canSave }: { posts: AdminPost[]; canSave: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "השמירה נכשלה.");
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`למחוק את הפוסט "${title}"? הפעולה אינה הפיכה.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "המחיקה נכשלה.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Editor                                                              */
  /* ------------------------------------------------------------------ */
  if (draft) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-7 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-bold text-navy">
            {draft.id ? "עריכת פוסט" : "פוסט חדש"}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="focus-brand rounded-full border border-ink/15 px-4 py-2 text-[14px] font-semibold hover:bg-canvas"
            >
              {preview ? "חזרה לעריכה" : "תצוגה מקדימה"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="focus-brand rounded-full px-4 py-2 text-[14px] font-semibold text-ink/60 hover:bg-canvas"
            >
              ביטול
            </button>
          </div>
        </div>

        {preview ? (
          <article className="mt-6 rounded-[22px] bg-canvas p-8">
            <h1 className="text-[32px] font-extrabold leading-tight text-navy">
              {draft.title || "כותרת הפוסט"}
            </h1>
            {draft.excerpt && <p className="mt-3 text-[17px] text-ink/70">{draft.excerpt}</p>}
            <div className="mt-6">
              <Markdown source={draft.body_md || "_עדיין אין תוכן._"} />
            </div>
          </article>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <Field
              label="כותרת"
              value={draft.title}
              onChange={(v) => set("title", v)}
              placeholder="למשל: איך לכתוב קורות חיים בעידן ה-AI"
            />
            <Field
              label="כתובת בקישור (רשות — נוצרת מהכותרת אוטומטית)"
              value={draft.slug}
              onChange={(v) => set("slug", v)}
              placeholder="cv-in-the-ai-era"
              ltr
            />
            <div>
              <label className="mb-1.5 block text-[14px] font-bold text-navy">
                תקציר — שתי שורות שמופיעות בכרטיס ובגוגל
              </label>
              <textarea
                value={draft.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                className="focus-brand w-full resize-y rounded-[18px] border border-ink/20 px-5 py-3 text-[15px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[14px] font-bold text-navy">
                תוכן הפוסט
              </label>
              <textarea
                value={draft.body_md}
                onChange={(e) => set("body_md", e.target.value)}
                rows={16}
                dir="rtl"
                placeholder={"## כותרת משנה\n\nפסקה רגילה.\n\n- פריט ברשימה\n- פריט נוסף\n\n**מודגש** ו[קישור](https://example.com)"}
                className="focus-brand w-full resize-y rounded-[18px] border border-ink/20 px-5 py-4 font-mono text-[14px] leading-relaxed"
              />
              <p className="mt-1.5 text-[13px] text-ink/55">
                אפשר להשתמש ב-Markdown: <code className="rounded bg-canvas px-1">##</code> לכותרת
                משנה, <code className="rounded bg-canvas px-1">**מודגש**</code>,{" "}
                <code className="rounded bg-canvas px-1">- </code> לרשימה.
              </p>
            </div>

            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => set("published", e.target.checked)}
                className="focus-brand h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-[15px]">מפורסם באתר</span>
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Button withArrow={false} onClick={save} disabled={busy || !canSave}>
            {busy ? "שומרת…" : "שמירת הפוסט"}
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* List                                                                */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button withArrow={false} onClick={() => setDraft(BLANK)} disabled={!canSave}>
          + פוסט חדש
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
          {error}
        </p>
      )}

      {posts.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white p-14 text-center">
          <p className="text-[17px] font-semibold text-navy">אין עדיין פוסטים במסד הנתונים</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-ink/65">
            כרגע מוצגים באתר שלושה מאמרי פתיחה. הפוסט הראשון שתכתבי כאן יחליף אותם.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]"
            >
              <div className="min-w-0">
                <p className="text-[17px] font-bold text-navy">{p.title}</p>
                <p className="mt-1 text-[13.5px] text-ink/55">
                  <span
                    className={cn(
                      "me-2 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                      isLive(p) ? "bg-mint-100 text-navy" : "bg-canvas text-ink/60",
                    )}
                  >
                    {isLive(p) ? "מפורסם" : "טיוטה"}
                  </span>
                  {formatDate(p.published_at)} · /{p.slug}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: p.id,
                      title: p.title,
                      slug: p.slug,
                      excerpt: p.excerpt ?? "",
                      body_md: p.body_md,
                      published: isLive(p),
                    })
                  }
                  className="focus-brand rounded-full border border-ink/15 px-4 py-2 text-[14px] font-semibold hover:bg-canvas"
                >
                  עריכה
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id, p.title)}
                  disabled={busy}
                  className="focus-brand rounded-full px-4 py-2 text-[14px] font-semibold text-red-600 hover:bg-red-50"
                >
                  מחיקה
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[14px] font-bold text-navy">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        className="focus-brand h-12 w-full rounded-full border border-ink/20 px-5 text-[15px]"
      />
    </div>
  );
}
