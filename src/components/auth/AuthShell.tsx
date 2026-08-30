import Link from "next/link";

/**
 * Full-bleed gradient backdrop with a centred white card — the frame used by
 * the login, register and profile screens in the mockups.
 */
export function AuthShell({
  icon,
  title,
  subtitle,
  children,
  closeHref = "/",
  wide = false,
}: {
  icon: "thumb" | "user";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  closeHref?: string;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-bl from-[var(--color-grad-from)] to-[var(--color-grad-to)] px-4 py-10 sm:py-16">
      <div
        className={
          "relative mx-auto rounded-[var(--radius-panel)] bg-white p-6 shadow-[0_30px_80px_-40px_rgb(0_19_72_/_0.6)] sm:p-10 " +
          (wide ? "max-w-[840px]" : "max-w-[620px]")
        }
      >
        <Link
          href={closeHref}
          aria-label="סגירה"
          className="focus-brand absolute left-5 top-5 grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-canvas"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </Link>

        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-navy">
            {icon === "thumb" ? <ThumbIcon /> : <UserIcon />}
          </span>
          <h1 className="mt-5 text-[30px] font-extrabold leading-tight text-navy sm:text-[34px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-ink/70">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function ThumbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path
        d="M7 10.5v9H4.5v-9H7Zm0 0 3.8-7.2a1.6 1.6 0 0 1 3 .8V9h4.9a1.7 1.7 0 0 1 1.65 2.1l-1.6 6.6A2 2 0 0 1 16.8 19.5H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="8.5" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 20.5c0-3.9 3.4-6.5 7.5-6.5s7.5 2.6 7.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
