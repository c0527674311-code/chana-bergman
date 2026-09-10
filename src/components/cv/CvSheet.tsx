import { Fragment } from "react";
import type { CvData, CvSampleFlags, CvTemplateId } from "@/lib/cv-builder";

/**
 * The A4 sheet — six templates in two families.
 *
 * The basics (clean/classic/accent/bold) are one layout with visual skins,
 * keeping the strict ATS rules from the site's own blog article: single
 * column, real text, standard section headings.
 *
 * The designed ones (elegant/rose) get their own layout components — a
 * monogram sheet and a sidebar-with-timeline sheet. They still use real
 * selectable text everywhere (no rasterized headers), so parsers can read
 * them, but they trade the strict single-column rule for standout design.
 *
 * Every section renders only when it has content, so a sparse CV prints
 * without empty headings. `sample` marks example content in the on-screen
 * preview; it is greyed out there and never passed for the print copy.
 *
 * Print pagination hooks (styled in globals.css, print only):
 *   cv-pad  — a box whose vertical padding repeats on every printed page
 *   cv-keep — never split across pages (an entry, the name block)
 *   cv-head — never left alone at the bottom of a page
 */
export function CvSheet({
  data,
  template,
  print = false,
  sample = {},
}: {
  data: CvData;
  template: CvTemplateId;
  print?: boolean;
  sample?: CvSampleFlags;
}) {
  if (template === "elegant") return <ElegantSheet data={data} print={print} sample={sample} />;
  if (template === "rose") return <RoseSheet data={data} print={print} sample={sample} />;
  return <SkinSheet data={data} template={template} print={print} sample={sample} />;
}

type SheetProps = { data: CvData; print: boolean; sample: CvSampleFlags };

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Frame({
  print,
  className,
  children,
}: {
  print: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={print ? "cv-print-area" : undefined}
      dir="rtl"
      className={`w-[210mm] min-h-[297mm] bg-white text-right ${className}`}
    >
      {children}
    </div>
  );
}

/** Greys out example content in the preview. */
function dim(isSample: boolean | undefined) {
  return isSample ? " opacity-40" : "";
}

function realExperience(data: CvData) {
  return data.experience.filter((e) => e.role.trim() || e.company.trim() || e.description.trim());
}

function realEducation(data: CvData) {
  return data.education.filter((e) => e.degree.trim() || e.institution.trim());
}

function contactItems(data: CvData, sample: CvSampleFlags, order: ("email" | "phone" | "city")[]) {
  return order
    .map((key) => ({ key, text: data[key].trim(), sample: sample[key] }))
    .filter((item) => item.text);
}

/** "email · phone · city", with each sample item greyed on its own. */
function ContactLine({
  data,
  sample,
  className,
}: {
  data: CvData;
  sample: CvSampleFlags;
  className: string;
}) {
  const items = contactItems(data, sample, ["email", "phone", "city"]);
  if (items.length === 0) return null;
  return (
    <p className={className} dir="ltr">
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 && "  ·  "}
          <span className={dim(item.sample).trim() || undefined}>{item.text}</span>
        </Fragment>
      ))}
    </p>
  );
}

/** "role · company" without a stray separator when one of them is blank. */
function RoleLine({
  main,
  sub,
  className,
  subClassName,
}: {
  main: string;
  sub: string;
  className: string;
  subClassName: string;
}) {
  if (!main && !sub) return null;
  return (
    <p className={className}>
      {main}
      {sub && (
        <span className={subClassName}>
          {main && " · "}
          {sub}
        </span>
      )}
    </p>
  );
}

function Dates({ from, to, className }: { from: string; to: string; className: string }) {
  if (!from && !to) return null;
  return (
    <p className={className} dir="ltr">
      {[from, to].filter(Boolean).join(" – ")}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Skin family — clean / classic / accent / bold                       */
/* ------------------------------------------------------------------ */

function SkinSheet({
  data,
  template,
  print,
  sample,
}: SheetProps & { template: SkinTemplateId }) {
  const t = STYLES[template];
  const experience = realExperience(data);
  const education = realEducation(data);

  return (
    <Frame print={print} className={`cv-pad px-[18mm] py-[16mm] ${t.body}`}>
      {/* Name block */}
      <header className={`cv-keep ${t.headerWrap}`}>
        {data.fullName && <p className={t.name + dim(sample.fullName)}>{data.fullName}</p>}
        {data.title && <p className={t.title + dim(sample.title)}>{data.title}</p>}
        <ContactLine data={data} sample={sample} className={t.contact} />
      </header>

      {data.summary && (
        <section className={"mt-6" + dim(sample.summary)}>
          <h2 className={`cv-head ${t.heading}`}>תמצית</h2>
          <p className={t.text}>{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className={"mt-6" + dim(sample.experience)}>
          <h2 className={`cv-head ${t.heading}`}>ניסיון תעסוקתי</h2>
          <div className="flex flex-col gap-4">
            {experience.map((e, i) => (
              <div key={i} className="cv-keep">
                <div className="flex items-baseline justify-between gap-4">
                  <RoleLine main={e.role} sub={e.company} className={t.itemTitle} subClassName={t.itemSub} />
                  <Dates from={e.from} to={e.to} className={t.dates} />
                </div>
                {e.description && <p className={`${t.text} mt-1`}>{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills && (
        <section className={"mt-6" + dim(sample.skills)}>
          <h2 className={`cv-head ${t.heading}`}>כישורים טכניים</h2>
          <p className={t.text} dir="ltr" style={{ textAlign: "right" }}>
            {data.skills}
          </p>
        </section>
      )}

      {education.length > 0 && (
        <section className={"mt-6" + dim(sample.education)}>
          <h2 className={`cv-head ${t.heading}`}>השכלה</h2>
          <div className="flex flex-col gap-2">
            {education.map((e, i) => (
              <div key={i} className="cv-keep flex items-baseline justify-between gap-4">
                <RoleLine main={e.degree} sub={e.institution} className={t.itemTitle} subClassName={t.itemSub} />
                {e.year && (
                  <p className={t.dates} dir="ltr">
                    {e.year}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.languages && (
        <section className={"mt-6" + dim(sample.languages)}>
          <h2 className={`cv-head ${t.heading}`}>שפות</h2>
          <p className={t.text}>{data.languages}</p>
        </section>
      )}
    </Frame>
  );
}

type SkinTemplateId = Exclude<CvTemplateId, "elegant" | "rose">;

type Skin = {
  body: string;
  headerWrap: string;
  name: string;
  title: string;
  contact: string;
  heading: string;
  itemTitle: string;
  itemSub: string;
  dates: string;
  text: string;
};

// Headings are block-level (w-fit where they look like chips): print
// pagination rules like break-after do not apply to inline-blocks.
const STYLES: Record<SkinTemplateId, Skin> = {
  clean: {
    body: "font-sans text-[13px] leading-relaxed text-[#1c1c3c]",
    headerWrap: "border-b-4 border-[#90e5d6] pb-5",
    name: "text-[30px] font-extrabold leading-tight text-[#001348]",
    title: "mt-1 text-[16px] font-semibold text-[#55556e]",
    contact: "mt-2 text-[12.5px] text-[#55556e] text-right",
    heading:
      "mb-2 block w-fit rounded bg-[#e2f9f4] px-2 py-0.5 text-[13.5px] font-extrabold text-[#001348]",
    itemTitle: "text-[13.5px] font-bold text-[#001348]",
    itemSub: "font-semibold text-[#55556e]",
    dates: "shrink-0 text-[12px] text-[#8a8a9c]",
    text: "text-[13px] text-[#33334a]",
  },
  classic: {
    body: "font-sans text-[13px] leading-relaxed text-black",
    headerWrap: "border-b border-black pb-5 text-center",
    name: "text-[28px] font-bold leading-tight",
    title: "mt-1 text-[15px]",
    contact: "mt-2 text-[12.5px] text-center",
    heading:
      "mb-2 border-b border-black/40 pb-1 text-[13.5px] font-bold uppercase tracking-wide",
    itemTitle: "text-[13.5px] font-bold",
    itemSub: "font-normal",
    dates: "shrink-0 text-[12px] text-black/60",
    text: "text-[13px] text-black/85",
  },
  accent: {
    body: "font-sans text-[13px] leading-relaxed text-[#1c1c3c] border-s-[6mm] border-[#6c83d0] -ms-[18mm] ps-[12mm]",
    headerWrap: "pb-5",
    name: "text-[30px] font-extrabold leading-tight text-[#4a61b4]",
    title: "mt-1 text-[16px] font-semibold text-[#55556e]",
    contact: "mt-2 text-[12.5px] text-[#55556e] text-right",
    heading: "mb-2 text-[14px] font-extrabold text-[#4a61b4]",
    itemTitle: "text-[13.5px] font-bold text-[#001348]",
    itemSub: "font-semibold text-[#55556e]",
    dates: "shrink-0 text-[12px] text-[#8a8a9c]",
    text: "text-[13px] text-[#33334a]",
  },
  bold: {
    body: "font-sans text-[13px] leading-relaxed text-[#1c1c3c]",
    headerWrap: "-mx-[18mm] -mt-[16mm] bg-[#001348] px-[18mm] pt-[14mm] pb-7 text-white",
    name: "text-[32px] font-extrabold leading-tight text-white",
    title: "mt-1 text-[16px] font-semibold text-[#90e5d6]",
    contact: "mt-3 text-[12.5px] text-white/75 text-right",
    heading:
      "mb-2 block w-fit border-b-[3px] border-[#90e5d6] pb-1 text-[14px] font-extrabold text-[#001348]",
    itemTitle: "text-[13.5px] font-bold text-[#001348]",
    itemSub: "font-semibold text-[#55556e]",
    dates: "shrink-0 text-[12px] text-[#8a8a9c]",
    text: "text-[13px] text-[#33334a]",
  },
};

/* ------------------------------------------------------------------ */
/* יוקרתית — serif monogram sheet with centered gold-ruled headings    */
/* ------------------------------------------------------------------ */

function ElegantSheet({ data, print, sample }: SheetProps) {
  const experience = realExperience(data);
  const education = realEducation(data);
  const initials = data.fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <Frame
      print={print}
      className="cv-pad px-[20mm] py-[16mm] font-serif text-[13px] leading-relaxed text-[#2b2b33]"
    >
      <header className="cv-keep text-center">
        {initials && (
          <div
            className={
              "mx-auto mb-4 grid h-[19mm] w-[19mm] place-items-center rounded-full border-2 border-[#b7995e] text-[23px] font-bold text-[#8a6d3b]" +
              dim(sample.fullName)
            }
          >
            {initials}
          </div>
        )}
        {data.fullName && (
          <p className={"text-[30px] font-bold leading-tight tracking-[0.04em]" + dim(sample.fullName)}>
            {data.fullName}
          </p>
        )}
        {data.title && (
          <p className={"mt-1 text-[15px] tracking-[0.14em] text-[#8a6d3b]" + dim(sample.title)}>
            {data.title}
          </p>
        )}
        <ContactLine data={data} sample={sample} className="mt-3 text-[12.5px] text-[#55555e]" />
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <span className="h-px w-16 bg-[#b7995e]" />
          <span className="text-[9px] leading-none text-[#b7995e]">◆</span>
          <span className="h-px w-16 bg-[#b7995e]" />
        </div>
      </header>

      {data.summary && (
        <section className={"mt-7" + dim(sample.summary)}>
          <GoldHeading>תמצית</GoldHeading>
          <p className="text-center text-[13px] leading-relaxed text-[#3c3c46]">{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className={"mt-7" + dim(sample.experience)}>
          <GoldHeading>ניסיון תעסוקתי</GoldHeading>
          <div className="flex flex-col gap-5">
            {experience.map((e, i) => (
              <div key={i} className="cv-keep">
                <div className="flex items-baseline justify-between gap-4">
                  <RoleLine
                    main={e.role}
                    sub={e.company}
                    className="text-[14px] font-bold text-[#2b2b33]"
                    subClassName="font-normal text-[#55555e]"
                  />
                  <Dates from={e.from} to={e.to} className="shrink-0 text-[12px] italic text-[#8a6d3b]" />
                </div>
                {e.description && (
                  <p className="mt-1 text-[13px] text-[#3c3c46]">{e.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills && (
        <section className={"mt-7" + dim(sample.skills)}>
          <GoldHeading>כישורים טכניים</GoldHeading>
          <p
            className="text-[13px] tracking-[0.02em] text-[#3c3c46]"
            dir="ltr"
            style={{ textAlign: "center" }}
          >
            {data.skills}
          </p>
        </section>
      )}

      {education.length > 0 && (
        <section className={"mt-7" + dim(sample.education)}>
          <GoldHeading>השכלה</GoldHeading>
          <div className="flex flex-col gap-2">
            {education.map((e, i) => (
              <div key={i} className="cv-keep flex items-baseline justify-between gap-4">
                <RoleLine
                  main={e.degree}
                  sub={e.institution}
                  className="text-[13.5px] font-bold text-[#2b2b33]"
                  subClassName="font-normal text-[#55555e]"
                />
                {e.year && (
                  <p className="shrink-0 text-[12px] italic text-[#8a6d3b]" dir="ltr">
                    {e.year}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.languages && (
        <section className={"mt-7" + dim(sample.languages)}>
          <GoldHeading>שפות</GoldHeading>
          <p className="text-center text-[13px] text-[#3c3c46]">{data.languages}</p>
        </section>
      )}
    </Frame>
  );
}

function GoldHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="cv-head mb-3 flex items-center gap-4">
      <span className="h-px flex-1 bg-[#b7995e]/40" />
      <h2 className="text-[13px] font-bold tracking-[0.22em] text-[#8a6d3b]">{children}</h2>
      <span className="h-px flex-1 bg-[#b7995e]/40" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ורודה — tinted sidebar + timeline for the experience section        */
/* ------------------------------------------------------------------ */

function RoseSheet({ data, print, sample }: SheetProps) {
  const experience = realExperience(data);
  const education = realEducation(data);
  const contact = contactItems(data, sample, ["phone", "email", "city"]);
  const skills = data.skills
    .split(/[,·]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Frame print={print} className="flex font-sans text-[13px] leading-relaxed text-[#33202a]">
      {/* Sidebar (start side = right in RTL) */}
      <aside className="cv-pad flex w-[62mm] shrink-0 flex-col gap-7 bg-[#fdf1f4] px-[9mm] py-[16mm]">
        {contact.length > 0 && (
          <section>
            <SideHeading>פרטי קשר</SideHeading>
            <div className="flex flex-col gap-1.5">
              {contact.map((item) => (
                <p
                  key={item.key}
                  className={"break-words text-[12.5px] text-[#6e5560]" + dim(item.sample)}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                >
                  {item.text}
                </p>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section className={dim(sample.skills).trim() || undefined}>
            <SideHeading>כישורים</SideHeading>
            <div className="flex flex-wrap justify-end gap-1.5" dir="ltr">
              {skills.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#e8b4c4] bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#8f3a55]"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.languages && (
          <section className={dim(sample.languages).trim() || undefined}>
            <SideHeading>שפות</SideHeading>
            <p className="text-[12.5px] text-[#6e5560]">{data.languages}</p>
          </section>
        )}

        {education.length > 0 && (
          <section className={dim(sample.education).trim() || undefined}>
            <SideHeading>השכלה</SideHeading>
            <div className="flex flex-col gap-3">
              {education.map((e, i) => (
                <div key={i} className="cv-keep">
                  {e.degree && <p className="text-[12.5px] font-bold text-[#4a2836]">{e.degree}</p>}
                  {e.institution && <p className="text-[12px] text-[#6e5560]">{e.institution}</p>}
                  {e.year && (
                    <p className="text-[11.5px] text-[#a08a93]" dir="ltr" style={{ textAlign: "right" }}>
                      {e.year}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>

      {/* Main column */}
      <main className="cv-pad flex-1 px-[11mm] py-[16mm]">
        <header className="cv-keep">
          {data.fullName && (
            <p className={"text-[30px] font-extrabold leading-tight text-[#8f3a55]" + dim(sample.fullName)}>
              {data.fullName}
            </p>
          )}
          {data.title && (
            <p className={"mt-1 text-[16px] font-semibold text-[#6e5560]" + dim(sample.title)}>
              {data.title}
            </p>
          )}
          <div className="mt-4 h-[3px] w-16 rounded-full bg-[#e8b4c4]" />
        </header>

        {data.summary && (
          <section className={"mt-7" + dim(sample.summary)}>
            <RoseHeading>תמצית</RoseHeading>
            <p className="text-[13px] text-[#4a3c43]">{data.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className={"mt-7" + dim(sample.experience)}>
            <RoseHeading>ניסיון תעסוקתי</RoseHeading>
            <div className="flex flex-col gap-5 border-s-2 border-[#f3d3dc] ps-5">
              {experience.map((e, i) => (
                <div key={i} className="cv-keep relative">
                  <span className="absolute -start-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#d87a97]" />
                  <div className="flex items-baseline justify-between gap-4">
                    <RoleLine
                      main={e.role}
                      sub={e.company}
                      className="text-[13.5px] font-bold text-[#4a2836]"
                      subClassName="font-semibold text-[#6e5560]"
                    />
                    <Dates from={e.from} to={e.to} className="shrink-0 text-[12px] text-[#a08a93]" />
                  </div>
                  {e.description && (
                    <p className="mt-1 text-[13px] text-[#4a3c43]">{e.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </Frame>
  );
}

function SideHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="cv-head mb-2 border-b border-[#e8b4c4] pb-1 text-[12.5px] font-extrabold tracking-[0.06em] text-[#8f3a55]">
      {children}
    </h2>
  );
}

function RoseHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="cv-head mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[#8f3a55]">
      <span className="h-[9px] w-[9px] rounded-sm bg-[#e8b4c4]" />
      {children}
    </h2>
  );
}
