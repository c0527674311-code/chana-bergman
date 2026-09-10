import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Section } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Markdown } from "@/components/site/Markdown";
import { SEED_POSTS, findSeedPost } from "@/lib/content/posts";
import { createClient, getCurrentUser, supabaseConfigured } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { SITE_NAME } from "@/lib/seo";
import type { Post } from "@/lib/types";

export const revalidate = 3600;

export async function generateStaticParams() {
  return SEED_POSTS.map((p) => ({ slug: p.slug }));
}

async function loadPost(slug: string): Promise<Post | null> {
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle<Post>();
    if (data) return data;
  }
  return findSeedPost(slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "המאמר לא נמצא" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      locale: "he_IL",
      siteName: SITE_NAME,
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.published_at ?? undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, post] = await Promise.all([getCurrentUser(), loadPost(slug)]);
  if (!post) notFound();

  return (
    <>
      <Header user={user} />
      <main>
        <Section className="pb-2 pt-14 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p data-reveal className="text-[13px] font-semibold uppercase tracking-[0.2em] text-primary">
              {formatDate(post.published_at)}
            </p>
            <h1
              data-reveal
              style={{ "--reveal-delay": "90ms" } as React.CSSProperties}
              className="mt-3 text-[34px] font-extrabold leading-[1.2] text-navy sm:text-[46px]"
            >
              {post.title}
            </h1>
            {post.excerpt && (
              <p
                data-reveal
                style={{ "--reveal-delay": "180ms" } as React.CSSProperties}
                className="mx-auto mt-5 max-w-2xl text-[18px] leading-relaxed text-ink/70"
              >
                {post.excerpt}
              </p>
            )}
          </div>
        </Section>

        <Section className="pt-6">
          <article className="mx-auto max-w-2xl">
            <Markdown source={post.body_md} />
          </article>

          <div className="mx-auto mt-16 max-w-2xl rounded-[var(--radius-card)] bg-canvas p-8 text-center">
            <h2 className="text-[21px] font-bold text-navy">מחפשת את המשרה הבאה שלך?</h2>
            <p className="mx-auto mt-2 max-w-md text-[16px] text-ink/75">
              השאירי קורות חיים פעם אחת, ותהיי במאגר שמנהלי הגיוס פונים אליו.
            </p>
            <ButtonLink href="/submit-cv" className="mt-6">
              שליחת קורות חיים
            </ButtonLink>
          </div>

          <p className="mt-10 text-center">
            <Link
              href="/blog"
              className="focus-brand rounded text-[15px] font-semibold text-primary hover:underline"
            >
              ← לכל המאמרים
            </Link>
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
