import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { isDemoMode } from "@/lib/queries";
import { DEMO_MODE_NOTICE } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: { default: "מערכת הניהול", template: "%s | מערכת הניהול" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-s lg:border-ink/10 lg:bg-white">
          <div className="flex items-center gap-3 px-6 py-5">
            <LogoMark className="h-9 w-9" />
            <div>
              <p className="text-[15px] font-bold leading-tight text-navy">מערכת הניהול</p>
              <Link href="/" className="focus-brand rounded text-[13px] text-ink/60 hover:text-primary">
                חזרה לאתר
              </Link>
            </div>
          </div>
          <AdminNav />
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
          {isDemoMode && (
            <p className="mb-6 rounded-2xl bg-amber-50 px-5 py-3 text-[14px] font-medium text-amber-900 ring-1 ring-amber-200">
              {DEMO_MODE_NOTICE}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
