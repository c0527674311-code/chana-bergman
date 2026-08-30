import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "mint" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-600 active:bg-primary-700",
  outline: "bg-white text-navy border border-mint hover:bg-mint-100",
  ghost: "bg-transparent text-ink hover:bg-primary-50",
  mint: "bg-mint text-navy hover:bg-mint-600",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 ps-4 pe-1.5 text-[13px] gap-2",
  md: "h-11 ps-6 pe-2 text-[15px] gap-3",
  lg: "h-14 ps-8 pe-2.5 text-[17px] gap-4",
};

const BADGE: Record<Size, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/**
 * The arrow badge that sits on the trailing (left, in RTL) edge of every
 * primary CTA in the design.
 */
function ArrowBadge({ size, variant }: { size: Size; variant: Variant }) {
  const chip =
    variant === "primary"
      ? "bg-white text-primary"
      : variant === "mint"
        ? "bg-white text-navy"
        : "bg-mint text-navy";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:-translate-y-0.5",
        BADGE[size],
        chip,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <path
          d="M4.5 11.5 11.5 4.5M11.5 4.5H6M11.5 4.5V10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

type BaseProps = {
  variant?: Variant;
  size?: Size;
  withArrow?: boolean;
  className?: string;
  children: React.ReactNode;
};

const base =
  "focus-brand group inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  withArrow = true,
  className,
  children,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, VARIANTS[variant], withArrow ? SIZES[size] : SIZES[size].replace(/pe-[\d.]+/, "pe-6"), className)}
      {...props}
    >
      <span>{children}</span>
      {withArrow && <ArrowBadge size={size} variant={variant} />}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  withArrow = true,
  className,
  children,
  ...props
}: BaseProps & { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      className={cn(base, VARIANTS[variant], withArrow ? SIZES[size] : SIZES[size].replace(/pe-[\d.]+/, "pe-6"), className)}
      {...props}
    >
      <span>{children}</span>
      {withArrow && <ArrowBadge size={size} variant={variant} />}
    </Link>
  );
}
