import type { Metadata } from "next";
import { MatchWorkbench } from "@/components/admin/MatchWorkbench";

export const metadata: Metadata = { title: "איתור לפי דרישה" };

export default function MatchPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-[30px] font-extrabold text-navy">איתור מיידי לפי דרישה</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-ink/70">
          הדביקי את טקסט הדרישה בדיוק כפי שהמעסיק שלח. המערכת תזהה את הטכנולוגיות, רמת
          הבכירות והאזור, ותדרג את כל המאגר מולם.
        </p>
      </header>
      <MatchWorkbench />
    </>
  );
}
