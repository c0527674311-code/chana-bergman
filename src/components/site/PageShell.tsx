import { Header, type HeaderUser } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/**
 * Inner-page frame, in the homepage's own visual language: white background,
 * an English display heading with one mint-marked word (exactly like
 * "About us" / "How does it work?" on the home sections), and the Hebrew
 * title beneath it. No separate hero treatment — inner pages read as a
 * natural continuation of the homepage.
 */
export function PageShell({
  user,
  title,
  lead,
  kicker,
  children,
}: {
  user?: HeaderUser;
  title: string;
  lead?: string;
  /** English display heading, e.g. "Open Positions" — last word gets the mint mark. */
  kicker?: string;
  children: React.ReactNode;
}) {
  const words = kicker?.trim().split(/\s+/) ?? [];
  const head = words.slice(0, -1).join(" ");
  const marked = words.at(-1);

  return (
    <>
      <Header user={user} />
      <main>
        {/* Same gutters as every Section (px-5 lg:px-10) and the exact
            SectionTitle type scale, so inner pages share one rhythm. */}
        <section className="px-5 pb-4 pt-14 text-center lg:px-10 lg:pt-20">
          <div className="mx-auto max-w-3xl">
            {kicker ? (
              <>
                <h1
                  data-reveal
                  dir="ltr"
                  className="font-display text-[34px] font-semibold leading-tight text-navy sm:text-[44px]"
                >
                  {head && <span>{head} </span>}
                  <span className="mark-mint">{marked}</span>
                </h1>
                <p
                  data-reveal
                  style={{ "--reveal-delay": "90ms" } as React.CSSProperties}
                  className="mt-2 text-[20px] font-semibold text-navy"
                >
                  {title}
                </p>
              </>
            ) : (
              <h1 data-reveal className="text-[34px] font-extrabold leading-tight text-navy sm:text-[42px]">
                {title}
              </h1>
            )}
            {lead && (
              <p
                data-reveal
                style={{ "--reveal-delay": "180ms" } as React.CSSProperties}
                className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink/70"
              >
                {lead}
              </p>
            )}
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </>
  );
}
