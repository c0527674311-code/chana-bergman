import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark, rebuilt as true vector from the supplied asset.
 *
 * The original file is a JPEG wrapped in an <svg>, which means it is opaque
 * white and blurs when scaled — unusable on the navy footer and on retina.
 * This redraws the same shape as real geometry: the magnifying-glass ring
 * flowing into a lower blob (the "B" of Bergman), with the separate dot,
 * in the green → teal → blue brand gradient.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 140" fill="none" className={cn("h-10 w-auto", className)} aria-hidden="true">
      <defs>
        <linearGradient id="cb-mark" x1="0" y1="0.1" x2="0.95" y2="1">
          <stop offset="0%" stopColor="#7CC79B" />
          <stop offset="34%" stopColor="#5FBFAC" />
          <stop offset="63%" stopColor="#45AEC0" />
          <stop offset="100%" stopColor="#5A7FC0" />
        </linearGradient>

        {/* White = ink, black = the ring's hole. */}
        <mask id="cb-mask">
          <rect width="100" height="140" fill="black" />
          <path
            d="M46 50 Q72 72 82.5 107.5"
            stroke="white"
            strokeWidth="31"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="42" cy="42" r="36" fill="white" />
          <circle cx="40.5" cy="108" r="15.5" fill="white" />
          <circle cx="42" cy="42" r="15.5" fill="black" />
        </mask>
      </defs>

      <rect width="100" height="140" fill="url(#cb-mark)" mask="url(#cb-mask)" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  compact = false,
  onDark = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
  /** Inverts the wordmark for the navy footer. */
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("focus-brand inline-flex items-center gap-3 rounded-2xl", className)}
      aria-label="חנה ברגמן — לעמוד הבית"
    >
      <LogoMark className={compact ? "h-8 w-auto" : "h-11 w-auto"} />
      {!compact && (
        <span className="flex flex-col">
          <span
            className={cn(
              "font-display leading-[1.08] tracking-[0.1em]",
              onDark ? "text-white" : "text-navy",
            )}
            dir="ltr"
          >
            <span className="block text-[15px] font-medium">CHANA</span>
            <span className="block text-[15px] font-medium">BERGMAN</span>
          </span>
          {/* The Hebrew descriptor line from the brand lock-up */}
          <span
            className={cn(
              "mt-0.5 text-[10px] font-medium tracking-[0.06em]",
              onDark ? "text-white/70" : "text-ink/60",
            )}
          >
            השמה מדויקת בהייטק
          </span>
        </span>
      )}
    </Link>
  );
}
