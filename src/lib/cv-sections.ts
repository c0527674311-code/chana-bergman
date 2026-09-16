/**
 * Splits a CV into its parts, so "מנוסה ב-Java" can mean what Chana means.
 *
 * Every graduate of a seminary studied Java, so a plain word search returned
 * three hundred "experienced" candidates. What an employer asks for is the
 * technology someone actually worked with — the difference between a line in
 * the employment history and a line in the course list.
 *
 * Headings are matched in both word orders: text pulled out of a Hebrew PDF
 * often comes back as "תעסוקתי ניסיון".
 */

export type CvSection = "experience" | "skills" | "projects" | "education" | "other";

const HEADINGS: [CvSection, RegExp][] = [
  [
    "experience",
    /^(ניסיון\s*(תעסוקתי|מקצועי|בעבודה|רלוונטי)?|(תעסוקתי|מקצועי)\s*ניסיון|היסטוריה\s*תעסוקתית|תעסוקתית\s*היסטוריה|תעסוקה|מקומות\s*עבודה|עבודה\s*מקומות|work\s*experience|professional\s*experience|experience|employment(\s*history)?)(?![\p{L}\p{N}])/iu,
  ],
  [
    "education",
    /^(השכלה(\s*(וקורסים|והכשרה|פורמלית))?|(וקורסים|פורמלית)\s*השכלה|לימודים|הכשרה(\s*מקצועית)?|קורסים|תעודות|education|courses?|academic(\s*background)?|training|certifications?)(?![\p{L}\p{N}])/iu,
  ],
  [
    "skills",
    /^(כישורים(\s*(טכניים|מקצועיים))?|(טכניים|מקצועיים)\s*כישורים|ידע\s*מקצועי|מקצועי\s*ידע|מיומנויות|טכנולוגיות|שפות\s*תכנות|תכנות\s*שפות|technical\s*skills|skills|technologies|tech\s*stack|expertise)(?![\p{L}\p{N}])/iu,
  ],
  ["projects", /^(פרויקטים|פרוייקטים|projects?|portfolio)(?![\p{L}\p{N}])/iu],
];

/** A short line that is the heading itself, not a sentence that mentions it. */
function headingOf(line: string): CvSection | null {
  const clean = line.trim().replace(/^[•*\-–—\s]+/, "");
  if (!clean || clean.length > 45) return null;
  for (const [section, pattern] of HEADINGS) {
    const m = pattern.exec(clean);
    // The heading has to be most of the line: "ניסיון תעסוקתי:" is a heading,
    // "בעלת 2 שנות ניסיון בפיתוח" is a sentence.
    if (m && (m[0].length / clean.length >= 0.45 || /[:：]\s*$/.test(clean))) return section;
  }
  return null;
}

export type CvSections = Record<CvSection, string>;

export function splitCvSections(text: string): CvSections {
  const sections: CvSections = { experience: "", skills: "", projects: "", education: "", other: "" };
  if (!text) return sections;

  // Before the first heading sits the name, the contact line and the profile
  // paragraph — worth searching, but it is nobody's employment history.
  let current: CvSection = "other";
  for (const line of text.split("\n")) {
    const heading = headingOf(line);
    if (heading) {
      current = heading;
      continue;
    }
    sections[current] += line + "\n";
  }
  return sections;
}

/** How much a match in each part is worth when ranking. */
export const SECTION_WEIGHT: Record<CvSection, number> = {
  experience: 1,
  skills: 0.9,
  other: 0.75,
  projects: 0.6,
  education: 0.5,
};

export const SECTION_LABEL: Record<CvSection, string> = {
  experience: "מניסיון תעסוקתי",
  skills: "מרשימת הכישורים",
  projects: "מפרויקטים",
  education: "מהשכלה / קורסים",
  other: "מקורות החיים",
};

/** Does the requirement ask for hands-on experience, rather than knowledge? */
export function asksForExperience(text: string): boolean {
  return /(ניסיון|מנוס(ה|ות|ים)|עבד(ה|ו|תי)?\s|hands[\s-]?on|experience|worked\s+with|years?\s+of)/i.test(text);
}
