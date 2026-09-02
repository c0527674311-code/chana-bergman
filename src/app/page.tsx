import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { HeroVideo } from "@/components/site/HeroVideo";
import { COMPANIES } from "@/components/site/CompanyLogos";
import { LogoMarquee, TagMarquee, TextMarquee } from "@/components/site/Marquee";
import { StatCircles } from "@/components/site/StatCircles";
import { TestimonialSlider } from "@/components/site/TestimonialSlider";
import { Card, Section, SectionTitle } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { CandidateContactForm } from "@/components/forms/CandidateContactForm";
import { HOME, ROLE_CHIPS, TESTIMONIALS } from "@/lib/content/site";
import { getCurrentUser } from "@/lib/supabase/server";

/** Candidate journey: register → upload CV → consulted before every send. */
const STEP_ICONS = [
  <path
    key="a"
    d="M10 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM3.5 20c.7-3.4 3.4-5.3 6.5-5.3 1 0 2 .2 2.8.6M17 14.5v6M14 17.5h6"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  />,
  <path
    key="b"
    d="M12 15V4.5m0 0L7.8 8.7M12 4.5l4.2 4.2M4.5 15.5v2.3A1.7 1.7 0 0 0 6.2 19.5h11.6a1.7 1.7 0 0 0 1.7-1.7v-2.3"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  />,
  <path
    key="c"
    d="M4 6.5h16v11H4zM4 7.5l8 5.5 8-5.5"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  />,
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <Header user={user} transparent />
      <main>
        {/* ---------------------------------------------------------------- */}
        {/* Hero — candidate-facing, office video                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative lg:grid lg:min-h-screen lg:grid-cols-[41%_59%]">
          {/* Column 1 in RTL = the right-hand side: video, flush to the corner.
              From lg up the video is absolutely positioned so its portrait
              aspect ratio can't stretch the hero past the viewport height —
              the text column alone decides the height. */}
          <div className="relative overflow-hidden rounded-b-[40px] lg:rounded-bl-[44px] lg:rounded-br-none lg:rounded-t-none">
            <HeroVideo
              src="/videos/hero-candidates.mp4"
              className="h-[45vh] min-h-[300px] lg:absolute lg:inset-0 lg:h-full"
            />
          </div>

          {/* Column 2 = the left-hand side */}
          <div className="flex min-w-0 flex-col justify-center pt-12 lg:pt-28">
            <div className="px-5 text-center lg:px-10 lg:text-start">
              <h1
                data-reveal
                className="text-[42px] font-extrabold leading-[1.1] text-navy sm:text-[58px] xl:text-[64px]"
              >
                {HOME.hero.titleLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p
                data-reveal
                style={{ "--reveal-delay": "220ms" } as React.CSSProperties}
                className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink/75 lg:mx-0"
              >
                {HOME.hero.lead}
              </p>
              <div
                data-reveal
                style={{ "--reveal-delay": "330ms" } as React.CSSProperties}
                className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
              >
                <ButtonLink href="/submit-cv" size="lg">
                  {HOME.hero.cta}
                </ButtonLink>
                <ButtonLink href="/jobs" variant="outline" size="lg">
                  {HOME.hero.ctaSecondary}
                </ButtonLink>
              </div>
            </div>

            {/* Client logo strips, pinned to the bottom of the fold */}
            <div className="mt-12 flex flex-col gap-3 overflow-hidden pb-16 lg:mt-auto lg:pb-10">
              <p className="sr-only">{HOME.logosTitle}</p>
              <LogoMarquee companies={COMPANIES} />
              <LogoMarquee companies={[...COMPANIES].reverse()} reverse durationSeconds={44} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Stat circles                                                     */}
        {/* ---------------------------------------------------------------- */}
        <Section className="py-14 lg:py-20">
          <div data-reveal>
            <StatCircles />
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* About me                                                         */}
        {/* ---------------------------------------------------------------- */}
        <Section id="about" className="pt-4 lg:pt-6">
          <SectionTitle en={HOME.about.kickerEn} he={HOME.about.name} />
          <div className="mx-auto mt-8 max-w-2xl space-y-5 text-center text-[16px] leading-[1.9] text-ink/80">
            {HOME.about.paragraphs.map((p, i) => (
              <p
                key={p.slice(0, 24)}
                data-reveal
                style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}
              >
                {p}
              </p>
            ))}
          </div>

          <h3 data-reveal className="mt-14 text-center text-[24px] font-bold text-navy">
            {HOME.about.jobsQuestion}
          </h3>
          <div data-reveal className="mt-6">
            <TagMarquee tags={ROLE_CHIPS} />
          </div>
          <p data-reveal className="mt-6 text-center text-[16px] text-ink/70">
            {HOME.about.jobsCaption}
          </p>
          <div data-reveal className="mt-6 text-center">
            <ButtonLink href="/submit-cv" size="md">
              {HOME.about.cta}
            </ButtonLink>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Recommendations                                                  */}
        {/* ---------------------------------------------------------------- */}
        <Section id="testimonials" tone="canvas" className="rounded-[var(--radius-panel)]">
          <SectionTitle en={HOME.recommendations.kickerEn} />
          <div data-reveal className="mt-12">
            <TestimonialSlider items={TESTIMONIALS} />
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* How does it work? — the candidate journey                        */}
        {/* ---------------------------------------------------------------- */}
        <Section id="how-it-works">
          <SectionTitle en={HOME.howItWorks.kickerEn} subtitle={HOME.howItWorks.subtitle} />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {HOME.howItWorks.steps.map((step, i) => {
              const cta = "cta" in step ? step.cta : null;
              const body = (
                <>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-navy">
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                      {STEP_ICONS[i]}
                    </svg>
                  </span>
                  <h3 className="mt-5 text-[19px] font-bold text-navy">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink/75">{step.body}</p>
                </>
              );

              // The upload step is the site's primary action, so its card is
              // the button — the whole surface is clickable, not just a link.
              return (
                <li key={step.title}>
                  {cta ? (
                    <Link
                      href={cta.href}
                      data-reveal
                      style={{ "--reveal-delay": `${i * 140}ms` } as React.CSSProperties}
                      className="focus-brand group flex h-full flex-col rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[0_10px_40px_-28px_rgb(28_28_60_/_0.4)] ring-2 ring-transparent transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)] hover:ring-mint"
                    >
                      {body}
                      <span className="mt-5 inline-flex items-center justify-center gap-1.5 text-[15px] font-bold text-primary">
                        {cta.label}
                        <span aria-hidden="true" className="transition-transform group-hover:-translate-x-1">
                          &rsaquo;
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <Card highlighted={i === 0} revealDelay={i * 140} className="h-full text-center">
                      {body}
                    </Card>
                  )}
                </li>
              );
            })}
          </ol>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Contact — personal inquiry                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="pt-6">
          <TextMarquee text={HOME.contact.marquee} />
        </div>

        <Section tone="canvas" id="contact" className="rounded-[var(--radius-panel)] pt-14 lg:pt-16">
          <div data-reveal className="text-center">
            <h2 className="text-[32px] font-bold leading-tight text-navy sm:text-[40px]">
              <span className="mark-mint">{HOME.contact.titleMarked}</span>
              {HOME.contact.titleRest}
            </h2>
            <p className="mt-3 text-[17px] text-ink/70">{HOME.contact.subtitle}</p>
          </div>
          <div data-reveal className="mx-auto mt-10 max-w-2xl">
            <CandidateContactForm />
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
