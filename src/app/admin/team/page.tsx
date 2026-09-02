import type { Metadata } from "next";
import { TeamManager } from "@/components/admin/TeamManager";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ניהול צוות" };

export default async function AdminTeamPage() {
  let currentEmail: string | null = null;

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentEmail = user?.email ?? null;
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">ניהול צוות</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          מוסיפים כתובת מייל של חשבון גוגל, ומי שנכנס איתה מקבל גישה מלאה למערכת
          הניהול. אם עוד אין לה חשבון כאן — הגישה נפתחת אוטומטית בכניסה הראשונה.
        </p>
      </header>

      <TeamManager currentEmail={currentEmail} />
    </>
  );
}
