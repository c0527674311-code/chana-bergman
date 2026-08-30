import type { CvData, CvTemplateId } from "@/lib/cv-builder";

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
 */
export function CvSheet({
  data,
  template,
  print = false,
}: {
  data: CvData;
  template: CvTemplateId;
  print?: boolean;
}) {
  if (template === "elegant") return <ElegantSheet data={data} print={print} />;
  if (template === "rose") return <RoseSheet data={data} print={print} />;
  return <SkinSheet data={data} template={template} print={print} />;
}

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

function realExperience(data: CvData) {
  return data.experience.filter((e) => e.role || e.company || e.description);
}

function realEducation(data: CvData) {
  return data.education.filter((e) => e.degree || e.institution);
}

function contactLine(data: CvData) {
  return [data.email, data.phone, data.city].filter(Boolean).join("  ·  ");
}

/* ------------------------------------------------------------------ */
/* Skin family — clean / classic / accent / bold                       */
/* ------------------------------------------------------------------ */

function SkinSheet({
  data,
  template,
  print,
}: {
  data: CvData;
  template: SkinTemplateId;
  print: boolean;
}) {
  const t = STYLES[template];
  const experience = realExperience(data);
  const education = realEducation(data);

  return (
    <Frame print={print} className={`px-[18mm] py-[16mm] ${t.body}`}>
      {/* Name block */}
      <header className={t.headerWrap}>
        <h1 className={t.name}>{data.fullName}</h1>
        {data.title && <p className={t.title}>{data.title}</p>}
        <p className={t.contact} dir="ltr">
          {contactLine(data)}
        </p>
      </header>

      {data.summary && (
        <section className="mt-6">
          <h2 className={t.heading}>תמצית</h2>
          <p className={t.text}>{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mt-6">
          <h2 className={t.heading}>ניסיון תעסוקתי</h2>
          <div className="flex flex-col gap-4">
            {experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className={t.itemTitle}>
                    {e.role}
                    {e.company && <span className={t.itemSub}> · {e.company}</span>}
                  </p>
                  {(e.from || e.to) && (
                    <p className={t.dates} dir="ltr">
                      {e.from}
                      {e.to && ` – ${e.to}`}
                    </p>
                  )}
                </div>
                {e.description && <p className={`${t.text} mt-1`}>{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills && (
        <section className="mt-6">
          <h2 className={t.heading}>כישורים טכניים</h2>
          <p className={t.text} dir="ltr" style={{ textAlign: "right" }}>
            {data.skills}
          </p>
        </section>
      )}

      {education.length > 0 && (
        <section className="mt-6">
          <h2 className={t.heading}>השכלה</h2>
          <div className="flex flex-col gap-2">
            {education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4">
                <p className={t.itemTitle}>
                  {e.degree}
                  {e.institution && <span className={t.itemSub}> · {e.institution}</span>}
                </p>
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
        <section className="mt-6">
          <h2 className={t.heading}>שפות</h2>
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

const STYLES: Record<SkinTemplateId, Skin> = {
  clean: {
    body: "font-sans text-[13px] leading-relaxed text-[#1c1c3c]",
    headerWrap: "border-b-4 border-[#90e5d6] pb-5",
    name: "text-[30px] font-extrabold leading-tight text-[#001348]",
    title: "mt-1 text-[16px] font-semibold text-[#55556e]",
    contact: "mt-2 text-[12.5px] text-[#55556e] text-right",
    heading:
      "mb-2 inline-block rounded bg-[#e2f9f4] px-2 py-0.5 text-[13.5px] font-extrabold text-[#001348]",
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
      "mb-2 inline-block border-b-[3px] border-[#90e5d6] pb-1 text-[14px] font-extrabold text-[#001348]",
    itemTitle: "text-[13.5px] font-bold text-[#001348]",
    itemSub: "font-semibold text-[#55556e]",
    dates: "shrink-0 text-[12px] text-[#8a8a9c]",
    text: "text-[13px] text-[#33334a]",
  },
};

/* ------------------------------------------------------------------ */
/* יוקרתית — serif monogram sheet with centered gold-ruled headings    */
/* ------------------------------------------------------------------ */

function ElegantSheet({ data, print }: { data: CvData; print: boolean }) {
  const experience = realExperience(data);
  const education = realEducation(data);
  const initials = data.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <Frame
      print={print}
      className="px-[20mm] py-[16mm] font-serif text-[13px] leading-relaxed text-[#2b2b33]"
    >
      <header className="text-center">
        <div className="mx-auto grid h-[19mm] w-[19mm] place-items-center rounded-full border-2 border-[#b7995e] text-[23px] font-bold text-[#8a6d3b]">
          {initials}
        </div>
        <h1 className="mt-4 text-[30px] font-bold leading-tight tracking-[0.04em]">
          {data.fullName}
        </h1>
        {data.title && (
          <p className="mt-1 text-[15px] tracking-[0.14em] text-[#8a6d3b]">{data.title}</p>
        )}
        <p className="mt-3 text-[12.5px] text-[#55555e]" dir="ltr">
          {contactLine(data)}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <span className="h-px w-16 bg-[#b7995e]" />
          <span className="text-[9px] leading-none text-[#b7995e]">◆</span>
          <span className="h-px w-16 bg-[#b7995e]" />
        </div>
      </header>

      {data.summary && (
        <section className="mt-7">
          <GoldHeading>תמצית</GoldHeading>
          <p className="text-center text-[13px] leading-relaxed text-[#3c3c46]">{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mt-7">
          <GoldHeading>ניסיון תעסוקתי</GoldHeading>
          <div className="flex flex-col gap-5">
            {experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[14px] font-bold text-[#2b2b33]">
                    {e.role}
                    {e.company && (
                      <span className="font-normal text-[#55555e]"> · {e.company}</span>
                    )}
                  </p>
                  {(e.from || e.to) && (
                    <p className="shrink-0 text-[12px] italic text-[#8a6d3b]" dir="ltr">
                      {e.from}
                      {e.to && ` – ${e.to}`}
                    </p>
                  )}
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
        <section className="mt-7">
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
        <section className="mt-7">
          <GoldHeading>השכלה</GoldHeading>
          <div className="flex flex-col gap-2">
            {education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4">
                <p className="text-[13.5px] font-bold text-[#2b2b33]">
                  {e.degree}
                  {e.institution && (
                    <span className="font-normal text-[#55555e]"> · {e.institution}</span>
                  )}
                </p>
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
        <section className="mt-7">
          <GoldHeading>שפות</GoldHeading>
          <p className="text-center text-[13px] text-[#3c3c46]">{data.languages}</p>
        </section>
      )}
    </Frame>
  );
}

function GoldHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-4">
      <span className="h-px flex-1 bg-[#b7995e]/40" />
      <h2 className="text-[13px] font-bold tracking-[0.22em] text-[#8a6d3b]">{children}</h2>
      <span className="h-px flex-1 bg-[#b7995e]/40" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ורודה — tinted sidebar + timeline for the experience section        */
/* ------------------------------------------------------------------ */

function RoseSheet({ data, print }: { data: CvData; print: boolean }) {
  const experience = realExperience(data);
  const education = realEducation(data);
  const skills = data.skills
    .split(/[,·]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Frame print={print} className="flex font-sans text-[13px] leading-relaxed text-[#33202a]">
      {/* Sidebar (start side = right in RTL) */}
      <aside className="flex w-[62mm] shrink-0 flex-col gap-7 bg-[#fdf1f4] px-[9mm] py-[16mm]">
        <section>
          <SideHeading>פרטי קשר</SideHeading>
          <div className="flex flex-col gap-1.5">
            {[data.phone, data.email, data.city].filter(Boolean).map((line, i) => (
              <p key={i} className="break-words text-[12.5px] text-[#6e5560]" dir="ltr" style={{ textAlign: "right" }}>
                {line}
              </p>
            ))}
          </div>
        </section>

        {skills.length > 0 && (
          <section>
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
          <section>
            <SideHeading>שפות</SideHeading>
            <p className="text-[12.5px] text-[#6e5560]">{data.languages}</p>
          </section>
        )}

        {education.length > 0 && (
          <section>
            <SideHeading>השכלה</SideHeading>
            <div className="flex flex-col gap-3">
              {education.map((e, i) => (
                <div key={i}>
                  <p className="text-[12.5px] font-bold text-[#4a2836]">{e.degree}</p>
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
      <main className="flex-1 px-[11mm] py-[16mm]">
        <header>
          <h1 className="text-[30px] font-extrabold leading-tight text-[#8f3a55]">
            {data.fullName}
          </h1>
          {data.title && (
            <p className="mt-1 text-[16px] font-semibold text-[#6e5560]">{data.title}</p>
          )}
          <div className="mt-4 h-[3px] w-16 rounded-full bg-[#e8b4c4]" />
        </header>

        {data.summary && (
          <section className="mt-7">
            <RoseHeading>תמצית</RoseHeading>
            <p className="text-[13px] text-[#4a3c43]">{data.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mt-7">
            <RoseHeading>ניסיון תעסוקתי</RoseHeading>
            <div className="flex flex-col gap-5 border-s-2 border-[#f3d3dc] ps-5">
              {experience.map((e, i) => (
                <div key={i} className="relative">
                  <span className="absolute -start-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#d87a97]" />
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[13.5px] font-bold text-[#4a2836]">
                      {e.role}
                      {e.company && (
                        <span className="font-semibold text-[#6e5560]"> · {e.company}</span>
                      )}
                    </p>
                    {(e.from || e.to) && (
                      <p className="shrink-0 text-[12px] text-[#a08a93]" dir="ltr">
                        {e.from}
                        {e.to && ` – ${e.to}`}
                      </p>
                    )}
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
    <h2 className="mb-2 border-b border-[#e8b4c4] pb-1 text-[12.5px] font-extrabold tracking-[0.06em] text-[#8f3a55]">
      {children}
    </h2>
  );
}

function RoseHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[#8f3a55]">
      <span className="h-[9px] w-[9px] rounded-sm bg-[#e8b4c4]" />
      {children}
    </h2>
  );
}
