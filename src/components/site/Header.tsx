"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { NAV } from "@/lib/content/site";
import { cn } from "@/lib/utils";

export type HeaderUser = { firstName: string | null; isAdmin: boolean } | null;

export function Header({
  user = null,
  transparent = false,
}: {
  user?: HeaderUser;
  /** Homepage variant: the bar floats over the hero image instead of sitting on white. */
  transparent?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <header
      className={cn(
        "top-0 z-50",
        transparent ? "absolute inset-x-0" : "sticky bg-white/90 backdrop-blur-md",
      )}
    >
      {/* The chrome is laid out left-to-right (logo left, nav centre, CTA right)
          to match the mockups, even though page content itself is RTL. */}
      <div dir="ltr" className="mx-auto flex h-20 max-w-[1400px] items-center gap-4 px-5 lg:px-10">
        <Logo />

        {/* One cluster: nav links + account menu, uniform gap throughout, so
            the eye reads a single balanced menu. Items run right-to-left
            (בית on the right, the account menu last). mx-auto centres the
            cluster in the free space between logo and CTAs, which also keeps
            it left of the hero video that the CTAs float over. */}
        <nav
          dir="rtl"
          className="mx-auto hidden items-center gap-7 lg:flex"
          aria-label="ניווט ראשי"
        >
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-brand rounded-lg text-[15px] transition-colors hover:text-primary",
                  active ? "font-bold text-primary" : "text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <div ref={userRef} className="relative">
            {/* -mx cancels most of the hover-pill padding so the visual gap
                around this item matches the plain links beside it. */}
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              aria-expanded={userOpen}
              aria-haspopup="menu"
              className="focus-brand -mx-2.5 flex items-center gap-1.5 rounded-full px-3 py-2 text-[15px] text-ink hover:bg-primary-50"
            >
              <span>הי, {user?.firstName ?? "משתמש"}</span>
              <svg
                viewBox="0 0 14 8"
                fill="none"
                className={cn("h-2 w-3 transition-transform", userOpen && "rotate-180")}
                aria-hidden="true"
              >
                <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            {userOpen && (
              <div
                role="menu"
                dir="rtl"
                className="absolute left-0 top-full mt-1 w-60 rounded-[22px] bg-white p-2 shadow-[var(--shadow-pop)] ring-1 ring-ink/5"
              >
                {user ? (
                  <>
                    <MenuItem href="/profile">הפרופיל שלי</MenuItem>
                    <MenuItem href="/profile/edit">עריכת פרטים אישיים</MenuItem>
                    {user.isAdmin && <MenuItem href="/admin">מערכת הניהול</MenuItem>}
                    <hr className="my-2 border-ink/10" />
                    <form action="/auth/signout" method="post">
                      <button
                        type="submit"
                        role="menuitem"
                        className="focus-brand w-full rounded-2xl px-4 py-2.5 text-start text-[15px] text-ink hover:bg-primary-50"
                      >
                        התנתקות
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <MenuItem href="/login">התחברות</MenuItem>
                    <MenuItem href="/register">הרשמה לאתר</MenuItem>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ButtonLink href="/employers" variant="primary" size="sm" className="hidden md:inline-flex">
            מעסיקים? כנסו
          </ButtonLink>
          <ButtonLink href="/submit-cv" variant="outline" size="sm" className="hidden sm:inline-flex">
            שליחת קורות חיים
          </ButtonLink>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="תפריט"
            className="focus-brand grid h-11 w-11 place-items-center rounded-full hover:bg-primary-50 lg:hidden"
          >
            <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" aria-hidden="true">
              {menuOpen ? (
                <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="ניווט נייד"
          className="border-t border-ink/10 bg-white px-5 pb-6 pt-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="focus-brand block rounded-2xl px-3 py-3 text-[16px] hover:bg-primary-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <hr className="my-3 border-ink/10" />
          <div className="flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/profile" className="focus-brand rounded-2xl px-3 py-3 hover:bg-primary-50">
                  הפרופיל שלי
                </Link>
                <Link href="/profile/edit" className="focus-brand rounded-2xl px-3 py-3 hover:bg-primary-50">
                  עריכת פרטים אישיים
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" className="focus-brand rounded-2xl px-3 py-3 hover:bg-primary-50">
                    מערכת הניהול
                  </Link>
                )}
                <form action="/auth/signout" method="post">
                  <button type="submit" className="focus-brand w-full rounded-2xl px-3 py-3 text-start hover:bg-primary-50">
                    התנתקות
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="focus-brand rounded-2xl px-3 py-3 hover:bg-primary-50">
                התחברות / הרשמה
              </Link>
            )}
            <ButtonLink href="/employers" variant="primary" size="md" className="mt-2 w-full">
              מעסיקים? כנסו
            </ButtonLink>
            <ButtonLink href="/submit-cv" variant="outline" size="md" className="w-full">
              שליחת קורות חיים
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="focus-brand block rounded-2xl px-4 py-2.5 text-[15px] text-ink hover:bg-primary-50"
    >
      {children}
    </Link>
  );
}
