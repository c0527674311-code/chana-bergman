import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "דרישות ומשרות" };

type RequirementRow = {
  id: string;
  title: string;
  status: string;
  is_public: boolean;
  seniority: string | null;
  region: string | null;
  required_technologies: string[];
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  open: "פתוחה",
  in_progress: "בטיפול",
  closed: "סגורה",
  cancelled: "בוטלה",
};

export default async function RequirementsPage() {
  let rows: RequirementRow[] = [];
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("requirements")
      .select("id, title, status, is_public, seniority, region, required_technologies, created_at")
      .order("created_at", { ascending: false })
      .returns<RequirementRow[]>();
    rows = data ?? [];
  }

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold text-navy">דרישות ומשרות</h1>
          <p className="mt-2 text-[16px] text-ink/70">
            כל דרישה שנפתחה, ומי נשלחה אליה. סימון &quot;ציבורית&quot; מפרסם אותה בלוח המשרות באתר.
          </p>
        </div>
        <ButtonLink href="/admin/match" size="md">
          איתור לפי דרישה
        </ButtonLink>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white p-14 text-center">
          <p className="text-[17px] font-semibold text-navy">אין עדיין דרישות</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-ink/65">
            כשמעסיק ממלא את טופס יצירת הקשר באתר, הפנייה תופיע כאן. אפשר גם לפתוח דרישה ידנית
            ממסך האיתור.
          </p>
          <ButtonLink href="/admin/match" className="mt-6">
            פתיחת דרישה
          </ButtonLink>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
          <table className="w-full min-w-[760px] text-[14px]">
            <caption className="sr-only">רשימת הדרישות</caption>
            <thead className="border-b border-ink/10 text-[13px] text-ink/55">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-semibold">כותרת</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">טכנולוגיות</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">בכירות / אזור</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">סטטוס</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">נפתחה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/match?requirement=${r.id}`}
                      className="focus-brand rounded font-semibold text-navy hover:text-primary"
                    >
                      {r.title}
                    </Link>
                    {r.is_public && (
                      <span className="ms-2 rounded-full bg-mint-100 px-2 py-0.5 text-[11.5px] font-semibold text-navy">
                        ציבורית
                      </span>
                    )}
                  </td>
                  <td className="max-w-[240px] px-5 py-3">
                    <span className="flex flex-wrap gap-1">
                      {r.required_technologies?.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-full bg-canvas px-2 py-0.5 text-[12px] text-ink/70">
                          {t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink/75">
                    {[r.seniority, r.region].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-[12.5px] font-semibold text-ink/75">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink/55">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
