import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BRAND, CONTACT_DETAILS, FOOTER } from "@/lib/content/site";

/**
 * Site footer.
 *
 * Shares the page's panel language — same rounded top corners and same
 * gutters as every Section — so it reads as the last panel of the page
 * rather than a separate block bolted underneath.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 rounded-t-[var(--radius-panel)] bg-navy text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-16 lg:px-10 lg:py-20">
        {/* One 12-column grid: brand · two link columns · contact */}
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            {/* The real lock-up, knocked out for the navy panel */}
            <Logo onDark />
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/70">{FOOTER.blurb}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {BRAND.values.map((v) => (
                <li
                  key={v}
                  className="rounded-full border border-white/20 px-3.5 py-1.5 text-[13px] text-white/80"
                >
                  #{v}
                </li>
              ))}
            </ul>
          </div>

          {FOOTER.columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h2 className="text-[16px] font-bold">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="focus-brand rounded text-[15px] text-white/70 transition-colors hover:text-mint"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact lives in the grid, not squeezed into the bottom bar */}
          <div className="lg:col-span-3">
            <h2 className="text-[16px] font-bold">צרו קשר</h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-[15px] text-white/70">
              <li>
                <a
                  href={`mailto:${CONTACT_DETAILS.email}`}
                  className="focus-brand block rounded transition-colors hover:text-mint"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                >
                  {CONTACT_DETAILS.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT_DETAILS.phone.replace(/-/g, "")}`}
                  className="focus-brand block rounded transition-colors hover:text-mint"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                >
                  {CONTACT_DETAILS.phone}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT_DETAILS.phoneAlt.replace(/-/g, "")}`}
                  className="focus-brand block rounded transition-colors hover:text-mint"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                >
                  {CONTACT_DETAILS.phoneAlt}
                </a>
              </li>
              <li className="leading-relaxed">{CONTACT_DETAILS.address}</li>
            </ul>
          </div>
        </div>

        <hr className="my-10 border-white/15" />

        {/* Bottom bar: legal on one side, copyright on the other */}
        <div className="flex flex-col gap-4 text-[14px] text-white/60 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {FOOTER.legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="focus-brand rounded transition-colors hover:text-mint">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p>
            © {year} {BRAND.name}. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}
