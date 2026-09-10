/** Data model + template registry for the public CV builder. */

export type CvExperience = {
  role: string;
  company: string;
  from: string;
  to: string;
  description: string;
};

export type CvEducation = {
  degree: string;
  institution: string;
  year: string;
};

export type CvData = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  skills: string;
  languages: string;
  experience: CvExperience[];
  education: CvEducation[];
};

export const EMPTY_CV: CvData = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  city: "",
  summary: "",
  skills: "",
  languages: "",
  experience: [{ role: "", company: "", from: "", to: "", description: "" }],
  education: [{ degree: "", institution: "", year: "" }],
};

/** Example content shown in the live preview until the real fields fill in. */
export const SAMPLE_CV: CvData = {
  fullName: "ישראלה ישראלי",
  title: "מפתחת Full Stack",
  email: "israela@example.com",
  phone: "052-000-0000",
  city: "ירושלים",
  summary:
    "מפתחת עם שלוש שנות ניסיון בבניית מערכות ווב מקצה לקצה. אוהבת קוד נקי, לומדת מהר, ומחפשת צוות שאפשר לצמוח בו.",
  skills: "C#, .NET, React, SQL Server, TypeScript, Git",
  languages: "עברית — שפת אם · אנגלית — רמה גבוהה",
  experience: [
    {
      role: "מפתחת Full Stack",
      company: "חברת תוכנה",
      from: "2023",
      to: "היום",
      description: "פיתוח והרחבה של מערכת ניהול לקוחות ב-.NET ו-React, כולל עבודה מול SQL Server.",
    },
  ],
  education: [{ degree: "הנדסאית תוכנה", institution: "סמינר וולף", year: "2022" }],
};

export const CV_TEMPLATES = [
  { id: "clean", name: "נקייה", note: "מודרנית עם קו מנטה — מתאימה לרוב המשרות" },
  { id: "classic", name: "קלאסית", note: "שחור-לבן שמרני — לחברות מסורתיות" },
  { id: "accent", name: "כחולה", note: "כותרות בכחול־נייבי עם פס צד עדין" },
  { id: "bold", name: "נייבי", note: "כותרת עליונה כהה עם מנטה — בולטת בערימת קורות חיים" },
  { id: "elegant", name: "יוקרתית", note: "מונוגרמה, סריף וקווי זהב — למפתחות בכירות ולתפקידי הובלה" },
  { id: "rose", name: "ורודה", note: "עמודת צד עם תגי טכנולוגיות בסגנון קוד וציר זמן לניסיון — הכי מיוחדת שלנו" },
] as const;

export type CvTemplateId = (typeof CV_TEMPLATES)[number]["id"];

export function isCvTemplateId(value: unknown): value is CvTemplateId {
  return CV_TEMPLATES.some((t) => t.id === value);
}

const TEXT_FIELDS = [
  "fullName",
  "title",
  "email",
  "phone",
  "city",
  "summary",
  "skills",
  "languages",
] as const;

/** Which parts of a preview are example content rather than her own. */
export type CvSampleFlags = Partial<Record<keyof CvData, boolean>>;

/**
 * Only what the candidate actually wrote: strings trimmed, blank experience
 * and education rows dropped. This — never the sample-filled preview — is
 * what goes into the downloaded PDF.
 */
export function cleanCv(data: CvData): CvData {
  const out = { ...data };
  for (const key of TEXT_FIELDS) out[key] = data[key].trim();
  out.experience = data.experience
    .map((e) => ({
      role: e.role.trim(),
      company: e.company.trim(),
      from: e.from.trim(),
      to: e.to.trim(),
      description: e.description.trim(),
    }))
    .filter((e) => e.role || e.company || e.description);
  out.education = data.education
    .map((e) => ({ degree: e.degree.trim(), institution: e.institution.trim(), year: e.year.trim() }))
    .filter((e) => e.degree || e.institution);
  return out;
}

/**
 * Fills blanks with sample content so the on-screen preview always looks like
 * a CV, and reports which parts are samples so the sheet can grey them out.
 */
export function withSample(data: CvData): { data: CvData; sample: CvSampleFlags } {
  const real = cleanCv(data);
  const merged = { ...real };
  const sample: CvSampleFlags = {};
  for (const key of TEXT_FIELDS) {
    if (!real[key]) {
      merged[key] = SAMPLE_CV[key];
      sample[key] = true;
    }
  }
  if (real.experience.length === 0) {
    merged.experience = SAMPLE_CV.experience;
    sample.experience = true;
  }
  if (real.education.length === 0) {
    merged.education = SAMPLE_CV.education;
    sample.education = true;
  }
  return { data: merged, sample };
}

/**
 * Rebuilds a CvData from untrusted JSON (a saved draft), keeping only
 * well-formed string fields so an old or tampered draft can't crash the form.
 */
export function normalizeCv(raw: unknown): CvData {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (o: Record<string, unknown>, k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  const rows = (k: string) =>
    Array.isArray(src[k])
      ? (src[k] as unknown[]).filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      : [];

  const out = { ...EMPTY_CV };
  for (const key of TEXT_FIELDS) out[key] = str(src, key);
  const experience = rows("experience").map((r) => ({
    role: str(r, "role"),
    company: str(r, "company"),
    from: str(r, "from"),
    to: str(r, "to"),
    description: str(r, "description"),
  }));
  const education = rows("education").map((r) => ({
    degree: str(r, "degree"),
    institution: str(r, "institution"),
    year: str(r, "year"),
  }));
  out.experience = experience.length ? experience : EMPTY_CV.experience;
  out.education = education.length ? education : EMPTY_CV.education;
  return out;
}

/** True once the candidate typed anything meaningful — gates the download. */
export function hasRealContent(data: CvData): boolean {
  return Boolean(data.fullName.trim() && (data.email.trim() || data.phone.trim()));
}
