import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { loadPublicJobs } from "@/lib/content/jobs";
import { SEED_POSTS } from "@/lib/content/posts";
import { createPublicClient } from "@/lib/supabase/public";
import type { JobPosting, Post } from "@/lib/types";

// Rebuilt at most hourly; saving a blog post also refreshes it right away.
export const revalidate = 3600;

const PAGES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.9 },
  { path: "/submit-cv", changeFrequency: "monthly", priority: 0.9 },
  { path: "/employers", changeFrequency: "monthly", priority: 0.8 },
  { path: "/cv-builder", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/accessibility", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

/** Same source as the blog index: published posts, or the starter articles while there are none. */
async function loadPosts(): Promise<Pick<Post, "slug" | "published_at">[]> {
  const supabase = createPublicClient();
  if (!supabase) return SEED_POSTS;
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("slug, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data?.length ? data : SEED_POSTS;
  } catch (err) {
    console.error("sitemap: posts load failed:", err);
    return SEED_POSTS;
  }
}

/** Never throws: a database problem drops the dynamic entries, not the sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, jobs] = await Promise.all([
    loadPosts(),
    loadPublicJobs().catch((): JobPosting[] => []),
  ]);

  return [
    ...PAGES.map(({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      changeFrequency,
      priority,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`,
      lastModified: post.published_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...jobs.map((job) => ({
      url: `${SITE_URL}/jobs/${encodeURIComponent(job.public_slug ?? job.id)}`,
      lastModified: job.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
