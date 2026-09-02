import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { candidateStats } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "דיוור קבוצתי" };

type CampaignRow = {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  campaign_recipients: { count: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "טיוטה",
  sending: "נשלח…",
  sent: "נשלח",
  failed: "נכשל",
};

export default async function CampaignsPage() {
  const stats = await candidateStats();

  let rows: CampaignRow[] = [];
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, subject, status, sent_at, created_at, campaign_recipients(count)")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<CampaignRow[]>();
    rows = data ?? [];
  }

  const provider = process.env.EMAIL_PROVIDER ?? "none";

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold text-navy">דיוור קבוצתי</h1>
          {/* Promised "no need for an external mailing system" unconditionally,
              directly above a warning saying nothing can be sent at all. Say
              what is true right now instead. */}
          <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
            {provider === "none" ? (
              <>
                בוחרים מועמדות במסך האיתור או במאגר, ולוחצים &quot;שליחת מייל&quot;. הבחירה
                והנוסח נשמרים — אבל <strong className="text-navy">כרגע מיילים לא יוצאים</strong>,
                כי עדיין לא חובר ספק דיוור.
              </>
            ) : (
              <>
                הדיוור נשלח מתוך המערכת — בוחרים מועמדות במסך האיתור או במאגר, ולוחצים
                &quot;שליחת מייל&quot;. אין צורך להיכנס למערכת דיוור חיצונית.
              </>
            )}
          </p>
        </div>
        <ButtonLink href="/admin/match" size="md">
          בחירת נמענות
        </ButtonLink>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tile label="ניתן לדוור אליהן" value={stats.mailable.toLocaleString("he-IL")} />
        <Tile label="סה״כ במאגר" value={stats.total.toLocaleString("he-IL")} />
        <Tile
          label="ספק שליחה"
          value={provider === "none" ? "לא מוגדר" : provider}
          warn={provider === "none"}
        />
      </div>

      {provider === "none" && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-5 py-3 text-[14px] font-medium text-amber-900 ring-1 ring-amber-200">
          לא הוגדר ספק דיוור. עד שיוגדר <code>EMAIL_PROVIDER</code> בקובץ הסביבה, מיילים לא יישלחו
          בפועל — הבחירה תישמר אבל לא תצא החוצה.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white p-14 text-center">
          <p className="text-[17px] font-semibold text-navy">עוד לא נשלחו דיוורים</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-ink/65">
            כל דיוור שיישלח יופיע כאן עם מספר הנמענות והסטטוס.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
          <table className="w-full min-w-[700px] text-[14px]">
            <caption className="sr-only">היסטוריית דיוורים</caption>
            <thead className="border-b border-ink/10 text-[13px] text-ink/55">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-semibold">נושא</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">נמענות</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">סטטוס</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">נשלח</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-canvas">
                  <td className="px-5 py-3 font-semibold text-navy">{c.subject}</td>
                  <td className="px-5 py-3 text-ink/75">
                    {c.campaign_recipients?.[0]?.count ?? 0}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-[12.5px] font-semibold text-ink/75">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink/55">
                    {formatDate(c.sent_at ?? c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Tile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
      <p className="text-[13px] font-semibold text-ink/55">{label}</p>
      <p className={`mt-2 text-[26px] font-extrabold leading-none ${warn ? "text-amber-700" : "text-navy"}`}>
        {value}
      </p>
    </div>
  );
}
