import { cn } from "@/lib/utils";

export function Section({
  className,
  children,
  tone = "plain",
  id,
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "plain" | "canvas" | "gradient";
  id?: string;
}) {
  const tinted = tone === "canvas" || tone === "gradient";

  return (
    <section
      id={id}
      className={cn(
        "px-5 py-20 lg:px-10 lg:py-28",
        // A tinted band is a panel, not a full-bleed stripe: inset it by the
        // shared page gutter so its rounding is visible and every coloured
        // block on the site lines up on the same vertical edge.
        tinted && "mx-[var(--page-gutter)] rounded-[var(--radius-panel)]",
        tone === "canvas" && "bg-canvas",
        tone === "gradient" && "bg-gradient-to-bl from-[var(--color-grad-from)] to-[var(--color-grad-to)] text-white",
        className,
      )}
    >
      <div className="mx-auto max-w-[1400px]">{children}</div>
    </section>
  );
}

/**
 * Section heading in the house style: an English display word with one word
 * highlighted in mint, and a Hebrew subtitle underneath.
 */
export function SectionTitle({
  en,
  he,
  subtitle,
  align = "center",
  className,
}: {
  /** e.g. ["How does it ", "work", "?"] — the middle part gets the mint marker */
  en?: readonly string[];
  he?: string;
  subtitle?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div data-reveal className={cn(align === "center" ? "text-center" : "text-start", className)}>
      {en && (
        <h2 className="font-display text-[34px] font-semibold leading-tight text-navy sm:text-[44px]" dir="ltr">
          {en.map((part, i) =>
            i === 1 ? (
              <span key={i} className="mark-mint">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </h2>
      )}
      {he && (
        <h3
          className={cn(
            "text-navy",
            en ? "mt-2 text-[20px] font-semibold" : "text-[32px] font-bold leading-tight sm:text-[40px]",
          )}
        >
          {he}
        </h3>
      )}
      {subtitle && (
        <p
          className={cn(
            "mt-3 text-[17px] text-ink/70",
            align === "center" && "mx-auto max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Hebrew-first heading with one word marked in mint. */
export function MarkedHeading({
  before,
  marked,
  after,
  className,
}: {
  before?: string;
  marked: string;
  after?: string;
  className?: string;
}) {
  return (
    <h2
      data-reveal
      className={cn("text-[32px] font-bold leading-tight text-navy sm:text-[42px]", className)}
    >
      {before}
      <span className="mark-mint">{marked}</span>
      {after}
    </h2>
  );
}

export function Card({
  className,
  children,
  highlighted = false,
  revealDelay,
}: {
  className?: string;
  children: React.ReactNode;
  highlighted?: boolean;
  /** Stagger offset in ms for the scroll-reveal entrance. */
  revealDelay?: number;
}) {
  return (
    <div
      data-reveal
      style={revealDelay ? ({ "--reveal-delay": `${revealDelay}ms` } as React.CSSProperties) : undefined}
      className={cn(
        "rounded-[var(--radius-card)] p-8 transition-shadow",
        highlighted ? "bg-mint-100" : "bg-white",
        "shadow-[0_10px_40px_-28px_rgb(28_28_60_/_0.4)] hover:shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
