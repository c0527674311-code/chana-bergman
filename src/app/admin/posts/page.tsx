import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/PostEditor";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const metadata: Metadata = { title: "ניהול הבלוג" };

export default async function AdminPostsPage() {
  let posts: Post[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Post[]>();
    posts = data ?? [];
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">ניהול הבלוג</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          כל פוסט שנכתב כאן מתפרסם בעמוד הטיפים באתר. זה גם מה שמביא תנועה מגוגל — כל
          מאמר הוא עמוד נוסף שאפשר למצוא בחיפוש.
        </p>
      </header>

      <PostEditor posts={posts} canSave={supabaseConfigured} />
    </>
  );
}
