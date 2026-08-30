import Image from "next/image";

/**
 * The client logo wall.
 *
 * Each entry renders either a real logo file from /public/logos (preferred —
 * just drop `<slug>.svg` in and set `file: true`) or a built-in wordmark drawn
 * in the brand's colour. The built-ins are recreations, not official artwork:
 * they read correctly at logo-wall size, but for print-quality fidelity use the
 * company's own SVG. See public/logos/README.md.
 *
 * ⚠️ These are third-party trademarks — list only companies Chana actually
 * places candidates with.
 */

export type Company = {
  /** Display name, also the file name when `file` is set. */
  name: string;
  /** Set true once /public/logos/<slug>.svg exists. */
  file?: boolean;
  slug?: string;
  /** Brand colour for the built-in wordmark. */
  color?: string;
  /** Optional icon rendered before the wordmark. */
  mark?: React.ReactNode;
  /** Letter-spacing / casing tweaks per brand. */
  className?: string;
  /** Hidden when true — keeps the entry around without showing it. */
  hidden?: boolean;
};

const redHat = (
  <svg viewBox="0 0 40 26" className="h-[18px] w-auto" aria-hidden="true">
    {/* fedora */}
    <path
      d="M8 16c-3.5 0-6 1-6 2.6C2 21.4 9.6 25 20 25s18-3.6 18-6.4c0-1.7-2.7-2.7-6.6-2.7"
      fill="#EE0000"
    />
    <path
      d="M12 15.6c0-1 .4-3 .9-4.7.7-2.5 2.2-5.2 4.6-5.2 1.5 0 2 1 3.1 1.9 1 .8 2.1 1 3.3 1 1 0 1.9-.3 2.6-.7.3-.2.7 0 .7.4 0 1.6.5 4.6.9 6 .3 1.2.6 2 .6 2.4 0 1.5-4.4 2.7-9.4 2.7S12 18 12 16.5v-.9Z"
      fill="#1a1a1a"
    />
  </svg>
);

const mondayBars = (
  <svg viewBox="0 0 26 16" className="h-[15px] w-auto" aria-hidden="true">
    <rect x="0" y="2" width="5.5" height="12" rx="2.75" fill="#FF3D57" />
    <rect x="9" y="2" width="5.5" height="12" rx="2.75" fill="#FFCB00" />
    <rect x="18" y="2" width="5.5" height="12" rx="2.75" fill="#00CA72" />
  </svg>
);

const checkMark = (
  <svg viewBox="0 0 20 20" className="h-[16px] w-auto" aria-hidden="true">
    <circle cx="10" cy="10" r="9" fill="#E6006E" />
    <path
      d="M5.5 10.3 8.6 13.4l6-6.4"
      stroke="#fff"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const cube3 = (
  <svg viewBox="0 0 20 20" className="h-[16px] w-auto" aria-hidden="true">
    <path d="M10 2 18 6.5v7L10 18 2 13.5v-7L10 2Z" fill="none" stroke="#5A6FC4" strokeWidth="1.7" />
    <path d="M10 2v8m0 0 8-3.5M10 10l-8-3.5" stroke="#5A6FC4" strokeWidth="1.7" fill="none" />
  </svg>
);

const flyerMark = (
  <svg viewBox="0 0 20 20" className="h-[16px] w-auto" aria-hidden="true">
    <path d="M3 14 17 3l-4.5 14L9.5 12 3 14Z" fill="#1A73E8" />
  </svg>
);

export const COMPANIES: Company[] = [
  { name: "Red Hat", color: "#1a1a1a", mark: redHat, className: "font-bold" },
  { name: "eToro", color: "#16C784", className: "font-bold lowercase tracking-tight" },
  { name: "AppsFlyer", color: "#1A73E8", mark: flyerMark, className: "font-semibold" },
  { name: "monday.com", color: "#323338", mark: mondayBars, className: "font-bold lowercase" },
  { name: "Check Point", color: "#E6006E", mark: checkMark, className: "font-bold uppercase tracking-wide text-[11px]" },
  { name: "Wix", color: "#000000", className: "font-extrabold tracking-tight" },
  { name: "Fiverr", color: "#1DBF73", className: "font-bold lowercase tracking-tight" },
  { name: "CyberArk", color: "#0B57A4", className: "font-semibold" },
  { name: "Amdocs", color: "#00A9CE", className: "font-semibold tracking-tight" },
  { name: "Elbit Systems", color: "#003B71", className: "font-semibold" },
  { name: "Matrix", color: "#0072BC", className: "font-bold tracking-tight" },
  { name: "NICE", color: "#1A1A1A", className: "font-extrabold tracking-[0.14em]" },
  { name: "JFrog", color: "#40BE46", className: "font-bold" },
  { name: "SolarEdge", color: "#E4002B", className: "font-semibold tracking-tight" },
  { name: "Playtika", color: "#E4002B", className: "font-bold tracking-tight" },
  { name: "Lightricks", color: "#111111", className: "font-semibold tracking-tight" },
  { name: "3base", color: "#5A6FC4", mark: cube3, className: "font-bold lowercase" },
  { name: "DiversiTech", color: "#C2185B", className: "font-semibold tracking-tight" },
  { name: "SOLINK", color: "#0E7C86", className: "font-bold tracking-[0.08em]" },
  { name: "Ready", color: "#F26522", className: "font-bold tracking-tight" },
  { name: "דעת", color: "#7B61FF", className: "font-bold" },
];

/** Renders a single company logo — real file if present, else the wordmark. */
export function CompanyLogo({ company }: { company: Company }) {
  if (company.file) {
    const slug = company.slug ?? company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return (
      <Image
        src={`/logos/${slug}.svg`}
        alt={company.name}
        width={120}
        height={28}
        className="h-[26px] w-auto object-contain"
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5" dir="ltr">
      {company.mark}
      <span
        className={`whitespace-nowrap text-[15px] leading-none ${company.className ?? "font-semibold"}`}
        style={{ color: company.color ?? "#1c1c3c" }}
      >
        {company.name}
      </span>
    </span>
  );
}
