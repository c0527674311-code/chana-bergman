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

export type CvSection =
  | "experience"
  | "practicum"
  | "skills"
  | "projects"
  | "education"
  | "other";

const HEADINGS: [CvSection, RegExp][] = [
  [
    "experience",
    // "נסיון" without the yod is as common as with it, in CVs and in what Chana types.
    /^(ני?סיון\s*(תעסוקתי|מקצועי|בעבודה|רלוונטי|מעשי|בתעשייה)?|(תעסוקתי|מקצועי|מעשי)\s*ני?סיון|רקע\s*(תעסוקתי|מקצועי)|היסטוריה\s*תעסוקתית|תעסוקתית\s*היסטוריה|תעסוקה|מקומות\s*עבודה|עבודה\s*מקומות|work\s*(experience|history)|professional\s*(experience|background)|relevant\s*experience|experience|employment(\s*history)?|career(\s*history)?)(?![\p{L}\p{N}])/iu,
  ],
  [
    "education",
    /^(השכלה(\s*(וקורסים|והכשרה|והכשרות|והסמכות|פורמלית|אקדמית))?|(וקורסים|פורמלית)\s*השכלה|לימודים|הכשרה(\s*מקצועית)?|הכשרות|קורסים(\s*(והסמכות|נוספים|והכשרות))?|הסמכות|תעודות|education|courses?|academic(\s*background)?|training|certifications?|certificates?)(?![\p{L}\p{N}])/iu,
  ],
  [
    "skills",
    /^(כישורים(\s*(טכניים|מקצועיים|טכנולוגיים))?|(טכניים|מקצועיים)\s*כישורים|ידע\s*(מקצועי|טכני|טכנולוגי|בתוכנות|במחשבים)|(מקצועי|טכני|טכנולוגי)\s*ידע|מיומנויות(\s*(טכניות|מקצועיות))?|טכנולוגיות|כלים(\s*וטכנולוגיות)?|שפות(\s*(תכנות|פיתוח))?|תכנות\s*שפות|סביבות\s*(עבודה|פיתוח)|בסיסי\s*נתונים|מסדי\s*נתונים|מערכות\s*הפעלה|יישומי\s*מחשב|(technical|professional|core|key|programming|computer|hard)\s*(skills|knowledge)|skills|technologies|tools(\s*(and|&)\s*technologies)?|tech(nical)?\s*stack|expertise|(programming\s*)?languages|databases?|operating\s*systems|frameworks)(?![\p{L}\p{N}])/iu,
  ],
  [
    "projects",
    /^((פרויקטים|פרוייקטים|פרויקט|פרוייקט)(\s*(נבחרים|גמר|אישיים|עצמאיים|סיום|בלימודים))?|(selected|personal|academic|side|final|key)\s*projects?|projects?|portfolio)(?![\p{L}\p{N}])/iu,
  ],
  [
    // Not a part worth ranking by — but it ends the part before it. Without
    // these, the hobbies and the recommendations after the last job were read
    // as more of that job.
    "other",
    /^(פרופיל(\s*(מקצועי|אישי))?|תמצית(\s*מקצועית)?|תקציר(\s*מקצועי)?|אודות(יי)?|קצת\s*עליי?|על\s*עצמי|פרטים\s*אישיים|פרטי\s*(קשר|התקשרות)|תכונות(\s*אישיות)?|כישורים\s*אישיים|ממליצים|המלצות|שונות|התנדבות|תחביבים|שירות\s*(צבאי|לאומי)|(professional\s*)?(summary|profile)|about(\s*me)?|objective|contact(\s*(info|details))?|personal\s*(details|info(rmation)?|skills)|soft\s*skills|references|recommendations|volunteering|volunteer(\s*work)?|hobbies|interests|military\s*service|national\s*service|additional(\s*information)?)(?![\p{L}\p{N}])/iu,
  ],
];

type Heading = { section: CvSection; rest: string };

/**
 * The heading a line opens with, and whatever shares the line with it.
 *
 * Text pulled out of a two-column PDF puts the heading and the first entry on
 * one line — "ניסיון מקצועי          2019 - היום: מפתחת תוכנה…" — so a rule
 * that only accepted a short line of its own missed whole employment histories.
 */
function headingOf(line: string): Heading | null {
  const clean = line.trim().replace(/^[•*\-–—\s]+/, "");
  if (!clean) return null;
  // "כישורים אישיים" is not a skills list; the more specific heading wins.
  let best: { section: CvSection; length: number } | null = null;
  for (const [section, pattern] of HEADINGS) {
    const m = pattern.exec(clean);
    if (m && (!best || m[0].length > best.length)) best = { section, length: m[0].length };
  }
  if (!best) return null;
  const after = clean.slice(best.length);
  // The heading alone on its line: "ניסיון תעסוקתי:" is a heading,
  // "בעלת 2 שנות ניסיון בפיתוח" is a sentence.
  if (clean.length <= 45 && (best.length / clean.length >= 0.45 || /[:：]\s*$/.test(clean))) {
    return { section: best.section, rest: "" };
  }
  // The heading, then a colon or a column gap, then the content.
  const gap = /^\s*[:：]\s*|^(?:\s{2,}|\t)\s*/.exec(after);
  if (gap) return { section: best.section, rest: after.slice(gap[0].length) };
  return null;
}

/**
 * A practicum is training, not a job — Chana's rule, and the employers'.
 * Candidates write it inside the employment history ("2026 | מפתחת Backend
 * (פרקטיקום) | Sola Security"), so the entry has to be recognised there: 46 of
 * the 445 CVs in the pool do exactly that.
 */
const PRACTICUM = /פרקטיקום|פרקטיקם|פרקטיקות|פרקטיקנטית|דיברסיטק|diversi\s*te(ch|ck)|practicum|internship|\bintern\b|trainee|סטאז['׳]?(?![\p{L}])|התמחות|מתרגלת|חונכת/iu;

export function isPracticumEntry(text: string): boolean {
  return PRACTICUM.test(text);
}

/**
 * The employment history, split into one job per entry: a blank line, or a
 * line that opens with a year, starts a new one. Without this, a practicum
 * line would disqualify the real job written under it.
 */
export function splitEntries(text: string): string[] {
  const entries: string[] = [];
  let current = "";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const startsEntry = /^[•*\-–—\s]*(?:(?:19|20)\d{2}|\d{1,2}\/(?:19|20)\d{2})/.test(line);
    if ((!line || startsEntry) && current.trim()) {
      entries.push(current);
      current = "";
    }
    current += raw + "\n";
  }
  if (current.trim()) entries.push(current);
  return entries;
}

export type CvSections = Record<CvSection, string>;

export function splitCvSections(text: string): CvSections {
  const sections: CvSections = { experience: "", practicum: "", skills: "", projects: "", education: "", other: "" };
  if (!text) return sections;

  // Before the first heading sits the name, the contact line and the profile
  // paragraph — worth searching, but it is nobody's employment history.
  let current: CvSection = "other";
  // A bullet is a line break that PDF extraction swallowed: "…ידע מקצועי•שפות
  // תכנות: C, COBOL…" arrived as one line, so the skills list was read as part
  // of the job above it and a COBOL line in a skills list looked like a job.
  const lines = text.replace(/[•●▪◆‣]+/g, "\n").split("\n");
  for (const line of lines) {
    const heading = headingOf(line);
    if (heading) {
      current = heading.section;
      if (heading.rest) sections[current] += heading.rest + "\n";
      continue;
    }
    sections[current] += line + "\n";
  }

  // Pull the practicum entries out of the employment history.
  if (sections.experience.trim()) {
    const entries = splitEntries(sections.experience);
    const jobs = entries.filter((e) => !isPracticumEntry(e));
    const training = entries.filter(isPracticumEntry);
    if (training.length) {
      sections.experience = jobs.join("");
      sections.practicum += training.join("");
    }
  }
  return sections;
}

/** How much a match in each part is worth when ranking. */
export const SECTION_WEIGHT: Record<CvSection, number> = {
  experience: 1,
  skills: 0.9,
  practicum: 0.55,
  other: 0.75,
  projects: 0.6,
  education: 0.5,
};

export const SECTION_LABEL: Record<CvSection, string> = {
  experience: "מניסיון תעסוקתי",
  practicum: "מפרקטיקום / התמחות — לא ניסיון תעסוקתי",
  skills: "מרשימת הכישורים",
  projects: "מפרויקטים",
  education: "מהשכלה / קורסים",
  other: "מקורות החיים",
};

/**
 * How long she has actually been working, counted from the dates in her
 * employment history.
 *
 * The stored band goes stale: a CV that said "7 שנים" when it was sent three
 * years ago still said seven, and Chana needs today's number. "2022 – היום"
 * read in 2026 is four years.
 */
export function yearsFromExperience(experience: string, now = new Date()): number | null {
  const thisYear = now.getFullYear();
  const YEAR = /(?:19|20)\d{2}/g;
  const ONGOING = /היום|כיום|הווה|present|current|now|עד\s*היום/i;

  let earliest: number | null = null;
  let latest: number | null = null;
  let ongoing = false;

  for (const entry of splitEntries(experience)) {
    // Only the entry's own header line carries its dates. A year mentioned
    // inside the description ("מערכת שעבדה מאז 2018", a course year) is not
    // when the job started, and counting it stretched people's seniority.
    const header = entry.split("\n").find((l) => l.trim()) ?? "";
    const years = (header.match(YEAR) ?? [])
      .map(Number)
      .filter((y) => y >= 1980 && y <= thisYear + 1);
    if (!years.length) continue;
    const min = Math.min(...years);
    const max = Math.max(...years);
    earliest = earliest == null ? min : Math.min(earliest, min);
    latest = latest == null ? max : Math.max(latest, max);
    if (ONGOING.test(entry)) ongoing = true;
  }

  if (earliest == null) return null;
  const end = ongoing ? thisYear : Math.max(latest ?? earliest, earliest);
  const years = end - earliest;
  return years >= 0 && years <= 50 ? years : null;
}

/** Does the requirement ask for hands-on experience, rather than knowledge? */
export function asksForExperience(text: string): boolean {
  return /(ני?סיון|מנוס(ה|ות|ים)|עבד(ה|ו|תי)?\s|hands[\s-]?on|experience|worked\s+with|years?\s+of)/i.test(text);
}
