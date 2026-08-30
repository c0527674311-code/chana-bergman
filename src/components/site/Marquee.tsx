import { CompanyLogo, type Company } from "@/components/site/CompanyLogos";
import { cn } from "@/lib/utils";

/**
 * Full-bleed scrolling word strip — the "CONTACT US CONTACT US …" band that
 * separates the About and Contact sections in the design.
 */
export function TextMarquee({
  text,
  className,
  durationSeconds = 28,
}: {
  text: string;
  className?: string;
  durationSeconds?: number;
}) {
  const items = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="px-6">
      {text}
    </span>
  ));
  return (
    <div
      data-marquee
      className={cn("marquee-paused w-full overflow-hidden py-6 select-none", className)}
      aria-hidden="true"
    >
      <div
        className="animate-marquee-ltr flex w-max whitespace-nowrap font-display text-[64px] font-semibold leading-none text-navy sm:text-[92px] lg:text-[132px]"
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
        dir="ltr"
      >
        {items}
        {items}
      </div>
    </div>
  );
}

/** Scrolling row of role-tag chips ("UX\UI Design ↗") — the About strip. */
export function TagMarquee({
  tags,
  durationSeconds = 30,
}: {
  tags: readonly string[];
  durationSeconds?: number;
}) {
  const row = tags.map((tag, i) => (
    <span
      key={`${tag}-${i}`}
      className="mx-1.5 inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/35 bg-white py-1.5 pe-3 ps-1.5 text-[13px] font-semibold text-primary"
      dir="ltr"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-mint-100 text-navy">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
          <path
            d="M4.5 11.5 11.5 4.5M11.5 4.5H6M11.5 4.5V10"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {tag}
    </span>
  ));
  return (
    <div className="marquee-paused w-full overflow-hidden" aria-hidden="true">
      <div
        className="animate-marquee-ltr flex w-max items-center"
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
      >
        {row}
        {row}
      </div>
    </div>
  );
}

/** Horizontally scrolling row of client logos. */
export function LogoMarquee({
  companies,
  reverse = false,
  durationSeconds = 34,
}: {
  companies: Company[];
  reverse?: boolean;
  durationSeconds?: number;
}) {
  const row = companies.map((c, i) => (
    <div
      key={`${c.name}-${i}`}
      className="mx-2 grid h-14 min-w-[164px] shrink-0 place-items-center rounded-full border border-ink/10 bg-white px-7 shadow-[0_2px_10px_-6px_rgb(28_28_60_/_0.25)]"
    >
      <CompanyLogo company={c} />
    </div>
  ));
  return (
    <div className="marquee-paused w-full overflow-hidden" aria-hidden="true">
      <div
        className={cn("flex w-max", reverse ? "animate-marquee-rtl" : "animate-marquee-ltr")}
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
      >
        {row}
        {row}
      </div>
    </div>
  );
}
