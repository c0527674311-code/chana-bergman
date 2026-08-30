import type { Metadata } from "next";
import { BulkImport } from "@/components/admin/BulkImport";

export const metadata: Metadata = { title: "ייבוא מסיבי" };

export default function ImportPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">ייבוא מסיבי</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          בוחרים תיקייה שלמה מהמחשב — כולל תת־תיקיות — וסוגרים את המחשב. הקבצים עולים לענן,
          נקראים, וכפילויות מתמזגות אוטומטית לפי מייל וטלפון.
        </p>
      </header>

      <BulkImport />
    </>
  );
}
