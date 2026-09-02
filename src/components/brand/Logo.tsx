import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Official brand lock-up.
 *
 * Source of truth is the supplied `Group 105.svg`, which is really a JPEG in an
 * SVG wrapper — opaque white, so it could not sit on the navy footer. The build
 * step cropped the lock-up out of the email signature and keyed the white
 * background to alpha, producing:
 *   /brand/logo.png          full lock-up, transparent  (light backgrounds)
 *   /brand/logo-on-dark.png  same, wordmark knocked to white (navy footer)
 *   /brand/logo-mark.png     symbol only, transparent
 * The untouched original is kept at /brand/logo-original.svg.
 *
 * These are raster at ~600px wide, exported well above display size so they
 * stay sharp on retina. If a true vector version ever arrives from Sky
 * Branding, drop it in and swap the `src` — nothing else needs to change.
 */

/** The symbol on its own. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={198}
      height={240}
      priority
      className={cn("h-10 w-auto", className)}
    />
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
  /** Symbol only — used where width is tight. */
  compact?: boolean;
  /** Uses the knocked-out lock-up for the navy footer. */
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("focus-brand inline-flex items-center rounded-2xl", className)}
      aria-label="חנה ברגמן — לעמוד הבית"
    >
      {compact ? (
        <LogoMark className="h-9 w-auto" />
      ) : (
        <Image
          src={onDark ? "/brand/logo-on-dark.png" : "/brand/logo.png"}
          alt="חנה ברגמן — השמה מדויקת בהייטק"
          width={612}
          height={241}
          priority
          className="h-12 w-auto sm:h-14"
        />
      )}
    </Link>
  );
}
