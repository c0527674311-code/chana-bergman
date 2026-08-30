import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { Section } from "@/components/site/Section";
import { SEED_POSTS } from "@/lib/content/posts";
import { createClient, getCurrentUser, supabaseConfigured } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/lib/types";

export const metadata: Metadata = {
  title: "טיפים לקריירה בהייטק",
  description:
    "איך לכתוב קורות חיים בעידן ה-AI, איך למצוא משרה ראשונה אחרי פרקטיקום, ומה באמת משתנה במעבר לראשות צוות.",
};

export const revalidate = 3600;

async function loadPosts(): Promise<Post[]> {
  if (!supabaseConfigured) return SEED_POSTS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .returns<Post[]>();
  return data?.length ? data : SEED_POSTS;
}

export default async function BlogPage() {
  const [user, posts] = await Promise.all([getCurrentUser(), loadPosts()]);

  return (
    <PageShell
      user={user}
      kicker="Tips & Insights"
      title="טיפים לקריירה בהייטק"
      lead="מה שלמדנו מאלפי השמות — על קורות חיים, ראיונות, והדרך למשרה הבאה."
    >
      <Section>
        <ul className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                data-reveal
                style={{ "--reveal-delay": `${(i % 3) * 120}ms` } as React.CSSProperties}
                className="focus-brand group flex h-full flex-col rounded-[var(--radius-card)] bg-white p-8 shadow-[0_10px_40px_-28px_rgb(28_28_60_/_0.4)] transition-shadow hover:shadow-[var(--shadow-card)]"
              >
                <h2 className="text-[24px] font-extrabold leading-[1.25] text-navy transition-colors group-hover:text-primary">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-4 flex-1 text-[15.5px] leading-relaxed text-ink/70">
                    {post.excerpt}
                  </p>
                )}
                <span className="mt-6 flex items-center justify-between text-[13px] text-ink/50">
                  {formatDate(post.published_at)}
                  <span
                    aria-hidden="true"
                    className="font-semibold text-primary transition-transform group-hover:-translate-x-1"
                  >
                    לקריאה &rsaquo;
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
