import Link from "next/link";
import { LoadError } from "@/components/admin/LoadError";
import { candidateStats } from "@/lib/queries";

export default async function AdminDashboard() {
  const stats = await candidateStats();

  const tiles = [
    { label: "מועמדות במאגר", value: stats.total, href: "/admin/candidates" },
    { label: "פעילות — מחפשות", value: stats.active, href: "/admin/candidates?status=active" },
    { label: "ניתן לדוור אליהן", value: stats.mailable, href: "/admin/campaigns" },
    { label: "נרשמו דרך האתר ב-30 הימים האחרונים", value: stats.signedUpLast30, href: "/admin/candidates" },
  ];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">סקירה</h1>
        <p className="mt-2 text-[16px] text-ink/70">
          הכול במקום אחד — כל חיפוש רץ על כל המאגר.
        </p>
      </header>

      {stats.failed && (
        <div className="mb-6">
          <LoadError />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="focus-brand rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)] transition-shadow hover:shadow-[var(--shadow-card)]"
          >
            <p className="text-[13px] font-semibold text-ink/55">{t.label}</p>
            <p className="mt-2 text-[34px] font-extrabold leading-none text-navy">
              {/* A failed load is not zero candidates. */}
              {stats.failed ? "—" : t.value.toLocaleString("he-IL")}
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Link
          href="/admin/match"
          className="focus-brand rounded-[var(--radius-card)] bg-gradient-to-bl from-[var(--color-grad-from)] to-[var(--color-grad-to)] p-8 text-white transition-transform hover:-translate-y-0.5"
        >
          <h2 className="text-[22px] font-bold">איתור מיידי לפי דרישה</h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/85">
            הדביקי את הדרישה כפי שהמעסיק שלח, וקבלי רשימה מדורגת עם הסבר לכל מועמדת.
          </p>
          <span className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-[15px] font-bold text-primary">
            פתחי דרישה חדשה &gt;
          </span>
        </Link>

        <div className="rounded-[var(--radius-card)] bg-white p-8 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
          <h2 className="text-[20px] font-bold text-navy">שנתונים במאגר</h2>
          {stats.cohorts.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {stats.cohorts.map((y) => (
                <li key={y}>
                  <Link
                    href={`/admin/candidates?cohort=${y}`}
                    className="focus-brand block rounded-full bg-canvas px-4 py-2 text-[14px] font-semibold text-navy hover:bg-mint-100"
                  >
                    {y}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] text-ink/60">
              {stats.failed ? "לא ניתן להציג שנתונים כרגע." : "אין עדיין נתוני שנתונים."}
            </p>
          )}
          <Link
            href="/admin/import"
            className="focus-brand mt-6 inline-block rounded text-[15px] font-bold text-primary hover:underline"
          >
            ייבוא מסיבי מהדיסק או מסמוב &gt;
          </Link>
        </div>
      </section>
    </>
  );
}
