"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "סקירה", exact: true },
  { href: "/admin/match", label: "איתור לפי דרישה", badge: "★" },
  { href: "/admin/candidates", label: "מאגר המועמדות" },
  { href: "/admin/requirements", label: "דרישות ומשרות" },
  { href: "/admin/leads", label: "פניות מהאתר" },
  { href: "/admin/campaigns", label: "דיוור קבוצתי" },
  { href: "/admin/posts", label: "ניהול הבלוג" },
  { href: "/admin/import", label: "ייבוא מסיבי" },
  { href: "/admin/team", label: "ניהול צוות" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="ניווט מערכת הניהול" className="px-3 pb-6">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-brand flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-[15px] transition-colors",
                  active ? "bg-primary text-white" : "text-ink hover:bg-primary-50",
                )}
              >
                {item.badge && <span aria-hidden="true">{item.badge}</span>}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
