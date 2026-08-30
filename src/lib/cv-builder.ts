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

/** Merges sample content into blanks so the preview always looks like a CV. */
export function withSample(data: CvData): CvData {
  const exp = data.experience.some((e) => e.role || e.company)
    ? data.experience
    : SAMPLE_CV.experience;
  const edu = data.education.some((e) => e.degree || e.institution)
    ? data.education
    : SAMPLE_CV.education;
  return {
    fullName: data.fullName || SAMPLE_CV.fullName,
    title: data.title || SAMPLE_CV.title,
    email: data.email || SAMPLE_CV.email,
    phone: data.phone || SAMPLE_CV.phone,
    city: data.city || SAMPLE_CV.city,
    summary: data.summary || SAMPLE_CV.summary,
    skills: data.skills || SAMPLE_CV.skills,
    languages: data.languages || SAMPLE_CV.languages,
    experience: exp,
    education: edu,
  };
}

/** True once the candidate typed anything meaningful — gates the download. */
export function hasRealContent(data: CvData): boolean {
  return Boolean(data.fullName.trim() && (data.email.trim() || data.phone.trim()));
}
