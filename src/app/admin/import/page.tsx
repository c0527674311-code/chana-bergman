import type { Metadata } from "next";
import { BulkImport } from "@/components/admin/BulkImport";

export const metadata: Metadata = { title: "ייבוא מסיבי" };

export default function ImportPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">ייבוא מסיבי</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          {/* This used to say "וסוגרים את המחשב". It is not true — the upload runs
              in this tab, so closing it stops the import mid-way. Chana read it,
              followed it, and lost a run of 500 files. */}
          בוחרים קבצים בודדים או תיקייה שלמה מהמחשב — כולל תת־תיקיות — ולוחצים{" "}
          <strong className="text-navy">התחלת ייבוא</strong>. הקבצים עולים לענן, נקראים,
          וכפילויות מתמזגות אוטומטית לפי מייל וטלפון. שם התיקייה נשמר כסיווג.
        </p>
        <p className="mt-3 max-w-2xl rounded-2xl bg-amber-50 px-4 py-3 text-[15px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <strong>חשוב:</strong> הכרטיסייה הזו חייבת להישאר פתוחה עד סוף הייבוא. קריאה של כל
          קובץ לוקחת חצי דקה עד דקה, כך שתיקייה של 500 קבצים יכולה לקחת שעה-שעתיים. אפשר
          להמשיך לעבוד בכרטיסיות אחרות.
        </p>
      </header>

      <BulkImport />
    </>
  );
}
