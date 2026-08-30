import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { CandidateForm } from "@/components/forms/CandidateForm";
import { createClient, getCurrentUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Candidate } from "@/lib/types";

export const metadata: Metadata = {
  title: "עריכת פרטים אישיים",
  robots: { index: false, follow: false },
};

export default async function EditProfilePage() {
  if (!supabaseConfigured) {
    return (
      <AuthShell
        icon="user"
        wide
        title="עריכת פרטים אישיים"
        subtitle="המערכת עדיין לא חוברה למסד הנתונים — ראי README להגדרת Supabase."
      >
        <CandidateForm mode="edit" submitLabel="שמירת שינויים" />
      </AuthShell>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/edit");

  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Candidate>();

  const firstName = candidate?.first_name ?? user.firstName ?? "";

  return (
    <AuthShell
      icon="user"
      wide
      closeHref="/profile"
      title={firstName ? `הי, ${firstName}` : "הי!"}
      subtitle="כאן תוכלי לערוך את הפרטים האישיים שלך"
    >
      <p className="pb-5 text-center text-[15px] text-ink/70">
        מלאי פרטים בטופס והכנסי למאגר בקלות:
      </p>
      <CandidateForm candidate={candidate} mode="edit" submitLabel="חנה, מעוניינת להצטרף למאגר :)" />
    </AuthShell>
  );
}
