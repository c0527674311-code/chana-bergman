import type { Metadata } from "next";
import { LeadsInbox, type Lead } from "@/components/admin/LeadsInbox";
import { INQUIRY_COMPANY } from "@/lib/leads";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "פניות מהאתר" };

/**
 * Employer leads and "שאלות?" inquiries. Both forms saved to employer_leads
 * for months with no screen that read the table — nobody knew they existed.
 */
export default async function LeadsPage() {
  let leads: Lead[] = [];
  let problem: string | null = null;

  if (!supabaseConfigured || !adminConfigured()) {
    problem = "המערכת עדיין לא מחוברת למסד הנתונים.";
  } else if (!(await getCurrentUser())?.isAdmin) {
    problem = "אין הרשאה לצפות בפניות.";
  } else {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employer_leads")
      .select("id, company_name, contact_name, email, phone, roles_wanted, attachment_path, handled, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      problem = "הייתה תקלה בטעינת הפניות — נסי לרענן.";
    } else {
      const paths = (data ?? []).map((l) => l.attachment_path).filter(Boolean) as string[];
      const signed = new Map<string, string>();
      if (paths.length) {
        const { data: urls } = await admin.storage
          .from("requirements")
          .createSignedUrls(paths, 60 * 60, { download: true });
        for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
      }
      leads = (data ?? []).map((l) => ({
        id: l.id,
        kind: l.company_name === INQUIRY_COMPANY ? "inquiry" : "employer",
        company: l.company_name === INQUIRY_COMPANY ? null : l.company_name,
        contactName: l.contact_name,
        email: l.email,
        phone: l.phone,
        message: l.roles_wanted,
        attachmentUrl: l.attachment_path ? (signed.get(l.attachment_path) ?? null) : null,
        handled: l.handled,
        createdAt: l.created_at,
      }));
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">פניות מהאתר</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          מעסיקים ששלחו דרישה, ושאלות מטופס &quot;שאלות?&quot; בעמוד הבית. על כל פנייה חדשה נשלח
          גם מייל. אחרי שחזרת אליהם — מסמנים &quot;טופלה&quot;.
        </p>
      </header>

      {problem ? (
        <p className="rounded-2xl bg-amber-50 px-5 py-3 text-[15px] font-medium text-amber-900 ring-1 ring-amber-200">
          {problem}
        </p>
      ) : (
        <LeadsInbox leads={leads} />
      )}
    </>
  );
}
