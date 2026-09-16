import {
  EXPERIENCE_YEARS,
  PROGRAMMING_LANGUAGES,
  REGIONS,
  SENIORITY,
  SPOKEN_LANGUAGES,
  TECHNOLOGIES,
} from "@/lib/data/options";
import { EXTRA_TECHNOLOGIES, EXTRA_TERMS } from "@/lib/data/tech-terms";
import {
  asksForExperience,
  SECTION_WEIGHT,
  splitCvSections,
  type CvSection,
} from "@/lib/cv-sections";
import type { Candidate, MatchEvidence, MatchResult } from "@/lib/types";

/**
 * Requirement matching — "איתור מיידי של מועמדת מתאימה לפי דרישה".
 *
 * Chana pastes the employer's requirement text exactly as it arrived. We pull
 * the requirements out of it and rank the whole database against them.
 *
 * The extraction is deliberately deterministic (dictionary + alias matching)
 * rather than a model call: it is instant, free, works offline, and — most
 * importantly — is explainable, so every result can state *why* it matched.
 */

/** Aliases so "נודג'יאס", "node js" and "NodeJS" all resolve to "Node.js". */
const ALIASES: Record<string, string> = {
  "node js": "Node.js",
  nodejs: "Node.js",
  node: "Node.js",
  "react native": "React Native",
  reactjs: "React",
  react: "React",
  "next js": "Next.js",
  nextjs: "Next.js",
  "vue js": "Vue",
  vuejs: "Vue",
  angularjs: "Angular",
  "asp net": "ASP.NET",
  aspnet: "ASP.NET",
  "dot net": ".NET",
  dotnet: ".NET",
  "net core": ".NET Core",
  "c sharp": "C#",
  csharp: "C#",
  "cpp": "C++",
  "c plus plus": "C++",
  js: "JavaScript",
  ts: "TypeScript",
  py: "Python",
  postgres: "PostgreSQL",
  psql: "PostgreSQL",
  mssql: "SQL Server",
  sqlserver: "SQL Server",
  mongo: "MongoDB",
  k8s: "Kubernetes",
  "ci cd": "CI/CD",
  cicd: "CI/CD",
  ml: "Machine Learning",
  ai: "Machine Learning",
  qa: "QA Automation",
  // Hebrew spellings Chana actually receives. The .NET family matters most:
  // it is the stack the seminaries teach, and "דוט נט" matched nothing before.
  "דוט נט": ".NET",
  "דוטנט": ".NET",
  "דוט נט קור": ".NET Core",
  "נט קור": ".NET Core",
  "איי אס פי": "ASP.NET",
  "סי שארפ": "C#",
  "אס קיו אל סרבר": "SQL Server",
  "אס קיו אל": "SQL",
  "טייפסקריפט": "TypeScript",
  "ריאקט נייטיב": "React Native",
  "נקסט": "Next.js",
  "ג׳נגו": "Django",
  "ג'נגו": "Django",
  "דוקר": "Docker",
  "קוברנטיס": "Kubernetes",
  "יוניטי": "Unity",
  "וורדפרס": "WordPress",
  "אוטומציה": "QA Automation",
  devops: "DevOps",
  "סייבר": "Cyber Security",
  "אנדרואיד": "Android",
  "ריאקט": "React",
  "אנגולר": "Angular",
  "ג׳אווה": "Java",
  "ג'אווה": "Java",
  "ג׳אווהסקריפט": "JavaScript",
  "ג'אווהסקריפט": "JavaScript",
  "פייתון": "Python",
  "נודג׳יאס": "Node.js",
};

const SENIORITY_HINTS: Array<[RegExp, string]> = [
  [/ראש(ת|י)?\s*צוות|team\s*lead|tech\s*lead/i, "ראשת צוות"],
  [/ארכיטקט/i, "ארכיטקטית"],
  [/ג['׳]וניור|junior|מתחיל|ללא\s*ניסיון/i, "ג'וניורית"],
  // "מתמחה" is also the verb "specialises": "מתמחה ב-React" is a skill, not
  // an intern, and used to file every such requirement under מתמחה.
  [/סטודנט|מתמח(?:ה|ות|ים|ת)?(?!\p{L})(?!\s*[-־]?\s*ב)/iu, "מתמחה"],
  [/בכיר|senior|סניור/i, "בכירה"],
  [/מנוס/i, "מנוסה"],
];

/** Canonical form of a vocabulary term, for comparing terms with each other. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // strip Hebrew niqqud
    .replace(/[.\-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise free text before searching it for terms. Same as norm(), except a
 * hyphen between two Latin letters/digits survives: "go-to" stays one token,
 * so the language Go is not read out of it. A hyphen or maqaf next to Hebrew
 * ("ב-React", "ה־SQL") still separates.
 */
function normText(s: string): string {
  return s
    .toLowerCase()
    .replace(/־/g, " ") // maqaf, before the niqqud range swallows it
    .replace(/[֑-ׇ]/g, "")
    .replace(/(?<![a-z0-9])-|-(?![a-z0-9])/g, " ")
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEBREW = /[֐-׿]/;

/**
 * Whole-token containment.
 *
 * Subtleties this has to get right:
 *  - `#` and `+` count as part of the token, otherwise the language "C"
 *    matches inside "C#" and "C++" and every C# CV looks like a C CV.
 *  - `&` joins a token too ("R&D" is not the language R), and for one- and
 *    two-letter terms so does a Latin hyphen ("go-to" is not Go, "C-level" is
 *    not C). Longer terms keep matching in compounds like "React-based".
 *  - Hebrew glues one-letter prefixes (ו/ה/ב/כ/ל/מ/ש) onto the next word, up
 *    to two of them, and onto Latin terms as well: "אזור המרכז" must match the
 *    region "מרכז", and "בReact", "וJava", "ולפייתון" must match their skill.
 */
function termPattern(needle: string): RegExp | null {
  const n = norm(needle);
  if (!n) return null;
  const escaped = n
    .split(" ")
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s-]+");
  const joiners = !HEBREW.test(n) && n.length <= 2 ? "&\\-" : "&";
  const edge = `\\p{L}\\p{N}#+${joiners}`;
  return new RegExp(`(?<![${edge}])(?:[הבלמושכ]{1,2})?${escaped}(?![${edge}])`, "giu");
}

function mentions(haystack: string, needle: string): boolean {
  const re = termPattern(needle);
  return re ? re.test(haystack) : false;
}

/**
 * Blank out every occurrence of `needle`, keeping the text length so
 * neighbouring terms still match. Used to let a longer term consume its own
 * text before shorter ones are tested against what is left.
 */
function blankTerm(haystack: string, needle: string): string {
  const re = termPattern(needle);
  if (!re) return haystack;
  return haystack.replace(re, (m) => " ".repeat(m.length));
}

export type ExtractedRequirement = {
  technologies: string[];
  programmingLanguages: string[];
  /**
   * Words from the requirement we have no vocabulary for. They are searched
   * for inside the CVs, so a technology missing from our lists still finds the
   * candidates who wrote it — finding one is a bonus, missing one costs
   * nothing, because the word may be an ordinary word in the sentence.
   */
  unknownTerms: string[];
  /** Spoken languages the requirement asks for ("דוברת אנגלית"). */
  spokenLanguages: string[];
  /** Those of them it wants at native level ("אנגלית שפת אם"). */
  nativeLanguages: string[];
  /** The text asks for hands-on experience ("ניסיון ב-", "מנוסה"), not just knowledge. */
  experienceRequested: boolean;
  seniority: string | null;
  /** Every region the requirement names — "בשרון או במרכז" is both. */
  regions: string[];
  minYears: number | null;
};

/** Hebrew number words written before "שנים"/"שנות". */
const YEAR_WORDS: Record<string, number> = {
  שתי: 2,
  שלוש: 3,
  ארבע: 4,
  חמש: 5,
  שש: 6,
  שבע: 7,
  שמונה: 8,
  תשע: 9,
  עשר: 10,
};

/**
 * Minimum years of experience the text asks for, or null.
 *
 * Every phrasing below is collected and the earliest one in the text wins —
 * "לפחות 5 שנות ניסיון, מתוכן שנתיים בניהול" asks for 5, not 2.
 */
function extractMinYears(text: string): number | null {
  // Percentages are job scope ("80% משרה"), never experience. Removed first so
  // no pattern below can read the number.
  const t = text
    .replace(/[֑-ׇ]/g, "")
    .replace(/\d+(?:[.,]\d+)?\s*(?:%|אחוז(?:ים)?)/g, " ");

  const hits: Array<{ index: number; years: number }> = [];
  const collect = (re: RegExp, years: (m: RegExpExecArray) => number) => {
    for (const m of t.matchAll(re)) {
      const y = years(m);
      if (Number.isFinite(y) && y <= 50) hits.push({ index: m.index, years: y });
    }
  };

  // "3 שנים", "2+ שנים", "+2 שנים", "לפחות 3 שנים", "3.5 years". A range
  // ("3-5 שנות ניסיון", "3 עד 5 שנים") asks for its lower bound.
  collect(
    /(?<![\d.])(\d+(?:\.\d+)?)(?:\s*(?:[-–—]|עד)\s*\d+(?:\.\d+)?)?\s*\+?\s*(?:שנות|שנים|שנה|שנ['׳]|years?|yrs?)(?!\p{L})/giu,
    (m) => Number(m[1]),
  );
  // "minimum 4" without a unit — but not "לפחות 3 ימים בשבוע".
  collect(
    /(?:לפחות|מינימום|(?<!\p{L})(?:minimum|min|at\s+least))\s*:?\s*(\d+(?:\.\d+)?)(?![\d.]|\s*(?:חודש|ימ|יום|שעות|שעה|עובד|months?|days?|hours?))/giu,
    (m) => Number(m[1]),
  );
  collect(/(?<!\p{L})חצי\s*שנ(?:ה|ת)(?!\p{L})/gu, () => 0.5);
  // "שנתיים", "משנתיים" (than two years) — but not "לשנתיים" (for two years).
  collect(/(?<!\p{L})[ובכמ]?שנתיים(?!\p{L})/gu, () => 2);
  collect(
    /(?<!\p{L})(שתי|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s+שנ(?:ות|ים)(?!\p{L})/gu,
    (m) => YEAR_WORDS[m[1]],
  );
  // A single year needs context — "שנה" alone is also "השנה", "שנה א'".
  collect(
    /(?<!\p{L})(?:(?:לפחות|מינימום|מעל|יותר\s*מ-?|ניסיון\s+של)\s*)שנ(?:ה|ת)(?:\s+אחת)?(?!\p{L})/gu,
    () => 1,
  );
  collect(/(?<!\p{L})[ובכ]?שנ(?:ה|ת)(?:\s+אחת)?\s+(?:ניסיון|לפחות)(?!\p{L})/gu, () => 1);

  if (!hits.length) return null;
  return hits.reduce((first, h) => (h.index < first.index ? h : first)).years;
}

/** Pull structured requirements out of a free-text job description. */
export function extractRequirement(text: string): ExtractedRequirement {
  const h = normText(text);

  const technologies: string[] = [];
  const programmingLanguages: string[] = [];

  // One longest-first pass over the vocabulary and the aliases together, each
  // match consuming the span it matched. Without the consumption step "SQL
  // Server" also reported a bare "SQL" — the word boundary falls on the space —
  // so every candidate who actually had SQL Server was listed as *missing* SQL
  // and scored down for it. Longest-first also means an alias can never shadow
  // a more specific real term.
  const vocabulary: { needle: string; canonical: string }[] = [
    ...TECHNOLOGIES.map((t) => ({ needle: t, canonical: t })),
    ...PROGRAMMING_LANGUAGES.map((l) => ({ needle: l, canonical: l })),
    // Stacks the form's dropdowns don't offer, so they exist only in CV text.
    ...EXTRA_TERMS.flatMap(({ term, aliases }) => [
      { needle: term, canonical: term },
      ...(aliases ?? []).map((needle) => ({ needle, canonical: term })),
    ]),
    ...Object.entries(ALIASES).map(([needle, canonical]) => ({ needle, canonical })),
  ].sort((a, b) => norm(b.needle).length - norm(a.needle).length);

  let unconsumed = h;
  for (const { needle, canonical } of vocabulary) {
    if (!mentions(unconsumed, needle)) continue;
    unconsumed = blankTerm(unconsumed, needle);
    if ((TECHNOLOGIES as readonly string[]).includes(canonical) || EXTRA_TECHNOLOGIES.includes(canonical)) {
      if (!technologies.includes(canonical)) technologies.push(canonical);
    } else if (!programmingLanguages.includes(canonical)) {
      programmingLanguages.push(canonical);
    }
  }

  let seniority: string | null = null;
  for (const [re, value] of SENIORITY_HINTS) {
    if (re.test(text)) {
      seniority = value;
      break;
    }
  }

  // All of them: taking the first hit in list order turned "בשרון או במרכז"
  // into a מרכז-only search, and a candidate in the שרון lost the points.
  const regions = REGIONS.filter((r) => mentions(h, r));

  const minYears = extractMinYears(text);

  // "דוברת אנגלית שפת אם" is a requirement like any other, and nothing looked
  // at spoken languages at all — the search came back empty.
  const spokenLanguages = SPOKEN_LANGUAGES.filter((l) => spokenNames(l).some((n) => mentions(h, n)));
  const nativeLanguages = spokenLanguages.filter((l) => nativeMention(h, l));

  return {
    technologies,
    programmingLanguages,
    spokenLanguages,
    nativeLanguages,
    experienceRequested: asksForExperience(text),
    unknownTerms:
      technologies.length || programmingLanguages.length || spokenLanguages.length
        ? []
        : unknownTerms(unconsumed),
    seniority,
    regions,
    minYears,
  };
}

/**
 * Ordinary words of a Hebrew or English job description. Anything left after
 * these is a candidate for "a technology we have never heard of".
 */
const STOPWORDS = new Set(
  `דרוש דרושה דרושים דרושות מפתח מפתחת מפתחים מפתחות מתכנת מתכנתת עבור חברה חברת משרה משרת
   מלאה חלקית ניסיון שנות שנים שנה לפחות מעל יתרון חובה ידע הכרות היכרות עבודה עובדת צוות
   בצוות סביבת סביבה תחום בתחום אזור באזור מרחוק היברידי משרדי בעלת יכולת ראש יסודיות אנגלית
   עברית תואר הנדסאית הנדסאי בוגרת בוגר קורס לימודים תפקיד התפקיד כולל וכן וגם עם על של את
   אנחנו אנו מחפשים מחפשות למשרה למשרד לחברה גדולה מובילה צומחת בתל אביב ירושלים מרכז
   required requirement requirements experience years year developer development engineer team
   lead senior junior full stack fullstack backend frontend back front end web software company
   position role job knowledge strong good excellent must have with and the for our you your
   work working remote hybrid office advantage plus min minimum maximum degree student graduate`
    .split(/\s+/)
    .filter(Boolean),
);

const HEBREW_PREFIX = /^[ובלכמהש]{1,2}(?=[֐-׿]{3,})/;

/** English names of the spoken languages, as CVs and requirements write them. */
const SPOKEN_ALIASES: Record<string, string[]> = {
  עברית: ["hebrew"],
  אנגלית: ["english"],
  רוסית: ["russian"],
  צרפתית: ["french"],
  ספרדית: ["spanish"],
  ערבית: ["arabic"],
  יידיש: ["yiddish"],
  אמהרית: ["amharic"],
  גרמנית: ["german"],
  פורטוגזית: ["portuguese"],
};

function spokenNames(language: string): string[] {
  return [language, ...(SPOKEN_ALIASES[language] ?? [])];
}

/**
 * "אנגלית שפת אם", "native English" — the language and the level next to each
 * other. The gap deliberately excludes commas: almost every Hebrew CV reads
 * "עברית שפת אם, אנגלית ברמה טובה", and a loose window read that as native
 * English for nearly everyone in the pool.
 */
const GAP = "[ \\t\\-–—:()\\[\\]\"'|]{0,6}";

/** Marks a language matched at the level the requirement asked for. */
const NATIVE_SUFFIX = " — שפת אם";

function nativeMention(text: string, language: string): boolean {
  const patterns: string[] = [];
  for (const name of spokenNames(language)) {
    const n = norm(name);
    patterns.push(
      `${n}${GAP}(?:ב?רמת${GAP})?שפת${GAP}אם`,
      `שפת${GAP}אם${GAP}ב?${n}`,
      `native${GAP}(?:level${GAP})?${n}`,
      `${n}${GAP}native`,
      `mother${GAP}tongue${GAP}${n}`,
      `${n}${GAP}mother${GAP}tongue`,
    );
  }
  return patterns.some((p) => new RegExp(p, "i").test(text));
}

function unknownTerms(text: string): string[] {
  const words = text.split(/[\s,.;:()[\]{}"'`|/\\]+/).filter(Boolean);
  // A couple of words is a name or a phone number, not a job description.
  if (words.length < 3) return [];

  const out: string[] = [];
  for (const word of words) {
    const token = word.replace(/^[-+]+|[-+]+$/g, "");
    if (!token || STOPWORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    if (token.length < 3 && !/[#+]/.test(token)) continue;
    for (const form of [token, token.replace(HEBREW_PREFIX, "")]) {
      if (form.length >= 3 && !STOPWORDS.has(form) && !out.includes(form)) out.push(form);
    }
    if (out.length >= 8) break;
  }
  return out;
}

/** Lower bound of an experience bucket, for comparing against minYears. */
function bucketFloor(bucket: string | null): number {
  if (!bucket) return 0;
  const m = bucket.match(/(\d+)/);
  if (bucket.includes("ללא")) return 0;
  // Some experience, under a year — enough for "חצי שנה", not for "שנה".
  if (bucket.includes("עד שנה")) return 0.5;
  return m ? Number(m[1]) : 0;
}

const WEIGHTS = { tech: 5, lang: 6, spoken: 4, seniority: 3, region: 2, years: 3, freshness: 1 };

/**
 * Every spelling that means the same skill, so a CV written as "ריאקט",
 * "nodejs" or "as400" still matches the canonical term.
 */
const SPELLINGS = (() => {
  const map = new Map<string, string[]>();
  const add = (canonical: string, needle: string) => {
    const list = map.get(canonical) ?? [];
    if (!list.includes(needle)) list.push(needle);
    map.set(canonical, list);
  };
  for (const [needle, canonical] of Object.entries(ALIASES)) add(canonical, needle);
  for (const { term, aliases } of EXTRA_TERMS) for (const a of aliases ?? []) add(term, a);
  return map;
})();

function spellings(term: string): string[] {
  return [term, ...(SPELLINGS.get(term) ?? [])];
}

/** The first required region the candidate is available in, if any. */
function matchingRegion(c: Candidate, req: ExtractedRequirement): string | null {
  return req.regions.find((r) => (c.preferred_regions ?? []).includes(r) || c.city === r) ?? null;
}

/**
 * Score one candidate against an extracted requirement.
 * Returns null when there is no signal at all, so the caller can drop her.
 */
export function scoreCandidate(
  candidate: Candidate,
  req: ExtractedRequirement,
): MatchResult | null {
  const skills = new Set(
    [...(candidate.technologies ?? []), ...(candidate.programming_languages ?? [])].map(norm),
  );
  // Her CV text, which search_text carries. The scan can only put values from
  // the form's lists into the fields, so a COBOL or Priority developer has
  // nothing in her lists to match — the words are in the CV itself.
  const cvText = normText(candidate.search_text ?? "");
  const has = (term: string) =>
    skills.has(norm(term)) || spellings(term).some((s) => mentions(cvText, s));

  // Which part of the CV a term sits in decides what it is worth: every
  // graduate studied Java, so "מנוסה ב-Java" has to mean the employment
  // history, not the course list.
  const sections = splitCvSections(candidate.search_text ?? "");
  const sectionText = {
    experience: normText(sections.experience),
    skills: normText(sections.skills),
    other: normText(sections.other),
    projects: normText(sections.projects),
    education: normText(sections.education),
  } satisfies Record<CvSection, string>;
  const SECTION_ORDER: CvSection[] = ["experience", "skills", "other", "projects", "education"];

  /** Where a term appears, how often in the employment history, and a quote. */
  const locate = (needles: string[]) => {
    let best: CvSection | null = null;
    let quote: string | undefined;
    let times = 0;
    for (const section of SECTION_ORDER) {
      const text = sectionText[section];
      if (!text) continue;
      for (const needle of needles) {
        const re = termPattern(needle);
        if (!re) continue;
        const hits = text.match(re);
        if (!hits?.length) continue;
        if (section === "experience") times += hits.length;
        if (best) continue;
        best = section;
        const m = termPattern(needle)?.exec(text);
        if (m) {
          const start = Math.max(0, m.index - 70);
          const end = Math.min(text.length, m.index + m[0].length + 70);
          quote = `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
        }
      }
    }
    return { section: best, quote, times };
  };

  // Chana sends these lists to employers, so every match must show its
  // source: which part of the CV it came from, or her card — never a bare score.
  const evidence: MatchEvidence[] = [];
  let experienceHits = 0;

  /** Records the match and returns what it is worth, 0–1, by where it sits. */
  const cite = (term: string, listed: boolean, needles: string[]): number => {
    const { section, quote, times } = locate(needles);
    if (section === "experience") experienceHits += times;
    if (section) {
      evidence.push({ term, source: "cv", quote, section });
      // A technology named again and again in the jobs she held is her trade,
      // not a line on a list.
      return Math.min(1, SECTION_WEIGHT[section] + (times >= 3 ? 0.15 : 0));
    }
    // On her card but nowhere in the CV text: real, but nothing says it comes
    // from a job she held.
    evidence.push({ term, source: "fields" });
    return listed ? SECTION_WEIGHT.skills : SECTION_WEIGHT.education;
  };

  const matchedTechnologies = req.technologies.filter(has);
  const missingTechnologies = req.technologies.filter((t) => !matchedTechnologies.includes(t));
  const matchedLangs = req.programmingLanguages.filter(has);
  const missingLangs = req.programmingLanguages.filter((l) => !matchedLangs.includes(l));
  // Words with no entry in our vocabulary: shown when found, never held
  // against her when not — a miss may just be an ordinary word.
  const matchedUnknown = req.unknownTerms.filter(has);

  // Each match is worth what its place in the CV says it is worth.
  const langValue = matchedLangs.reduce((sum, l) => sum + cite(l, skills.has(norm(l)), spellings(l)), 0);
  const techValue = matchedTechnologies.reduce(
    (sum, t) => sum + cite(t, skills.has(norm(t)), spellings(t)),
    0,
  );
  const unknownValue = matchedUnknown.reduce((sum, t) => sum + cite(t, false, [t]), 0);

  let score = 0;
  let max = 0;

  if (req.technologies.length) {
    max += WEIGHTS.tech * req.technologies.length;
    score += WEIGHTS.tech * techValue;
  }
  if (req.programmingLanguages.length) {
    max += WEIGHTS.lang * req.programmingLanguages.length;
    score += WEIGHTS.lang * langValue;
  }

  if (req.unknownTerms.length) {
    max += WEIGHTS.tech;
    if (matchedUnknown.length) score += WEIGHTS.tech * Math.min(1, unknownValue);
  }

  // Spoken languages. "שפת אם" is a level the fields don't hold, so it is read
  // from the CV text; knowing the language without that level is half a point.
  const spokenList = new Set((candidate.spoken_languages ?? []).map(norm));
  const matchedSpoken: string[] = [];
  for (const language of req.spokenLanguages) {
    max += WEIGHTS.spoken;
    const knows =
      spokenList.has(norm(language)) || spokenNames(language).some((n) => mentions(cvText, n));
    const native = nativeMention(cvText, language);
    if (req.nativeLanguages.includes(language)) {
      if (native) {
        score += WEIGHTS.spoken;
        matchedSpoken.push(`${language}${NATIVE_SUFFIX}`);
        cite(`${language}${NATIVE_SUFFIX}`, false, ["שפת אם", "native", "mother tongue"]);
      } else if (knows) {
        score += WEIGHTS.spoken / 2;
        matchedSpoken.push(language);
        cite(language, spokenList.has(norm(language)), spokenNames(language));
      }
    } else if (knows) {
      score += WEIGHTS.spoken;
      matchedSpoken.push(language);
      cite(language, spokenList.has(norm(language)), spokenNames(language));
    }
  }

  if (req.seniority) {
    max += WEIGHTS.seniority;
    if (candidate.seniority === req.seniority) {
      score += WEIGHTS.seniority;
      evidence.push({ term: candidate.seniority, source: "fields" });
    }
  }

  const region = matchingRegion(candidate, req);
  if (req.regions.length) {
    max += WEIGHTS.region;
    if (region) {
      score += WEIGHTS.region;
      evidence.push({ term: `אזור ${region}`, source: "fields" });
    }
  }

  if (req.minYears != null) {
    max += WEIGHTS.years;
    if (bucketFloor(candidate.experience_years) >= req.minYears) {
      score += WEIGHTS.years;
      evidence.push({ term: `ניסיון: ${candidate.experience_years}`, source: "fields" });
    }
  }

  // Nothing in the requirement to measure against — not a match, just noise.
  if (max === 0) return null;

  // A small nudge for recently-updated profiles, so stale records sink.
  max += WEIGHTS.freshness;
  const monthsOld =
    (Date.now() - new Date(candidate.updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsOld < 12) score += WEIGHTS.freshness * (1 - monthsOld / 12);

  const pct = Math.round((score / max) * 100);
  if (pct <= 0) return null;

  return {
    candidate,
    score: pct,
    reason: buildReason(
      candidate,
      matchedLangs,
      [...matchedTechnologies, ...matchedUnknown, ...matchedSpoken],
      missingLangs.concat(missingTechnologies),
      req,
      region,
    ),
    matchedTechnologies: [...matchedLangs, ...matchedTechnologies, ...matchedUnknown, ...matchedSpoken],
    missingTechnologies: [...missingLangs, ...missingTechnologies],
    evidence,
    // At least one of the things asked for appears in a job she held.
    experienceMatch: experienceHits > 0,
  };
}

/** One human-readable line explaining the match — shown next to every result. */
function buildReason(
  c: Candidate,
  matchedLangs: string[],
  matchedTech: string[],
  missing: string[],
  req: ExtractedRequirement,
  region: string | null,
): string {
  const parts: string[] = [];
  const hits = [...matchedLangs, ...matchedTech];
  if (hits.length) parts.push(hits.join(", "));
  if (c.experience_years) {
    // The bucket labels are not uniform: "3-5 שנים" needs the word appended,
    // "ללא ניסיון" already carries it and became "ללא ניסיון ניסיון".
    parts.push(
      c.experience_years.includes("ניסיון")
        ? c.experience_years
        : `${c.experience_years} ניסיון`,
    );
  }
  if (req.seniority && c.seniority === req.seniority) parts.push(c.seniority);
  if (region) parts.push("אזור " + region);
  let line = parts.length ? parts.join(" · ") : "התאמה חלקית";
  if (missing.length) line += ` · חסר: ${missing.slice(0, 3).join(", ")}`;
  return line;
}

/**
 * Worth showing, as opposed to merely ranked.
 *
 * Every candidate who scored above zero used to come back — with hundreds of
 * CVs in the pool that is a list of everyone who happens to live in the right
 * area, and the answer to "who fits this requirement" drowns in it.
 *
 * When the requirement names skills, a candidate must actually have one of
 * them; when it names many, a third of them. When it names none (region,
 * seniority or experience only), only a high score counts.
 */
function isRelevant(result: MatchResult, req: ExtractedRequirement): boolean {
  const asked = req.programmingLanguages.length + req.technologies.length;
  // "אנגלית שפת אם" asks for the level, not just the language: knowing English
  // is a near miss, not a match.
  if (!asked && req.nativeLanguages.length) {
    return result.matchedTechnologies.some((t) => t.endsWith(NATIVE_SUFFIX));
  }
  // Only unknown words or a spoken language to go on: she must have one.
  if (!asked && (req.unknownTerms.length || req.spokenLanguages.length)) {
    return result.matchedTechnologies.length > 0;
  }
  if (!asked) return result.score >= 60;
  const hits = result.matchedTechnologies.length;
  if (!hits) return false;
  return asked <= 2 || hits >= Math.ceil(asked / 3);
}

/** Did the text say anything we can rank against? */
function hasSignals(req: ExtractedRequirement): boolean {
  return Boolean(
    req.technologies.length ||
      req.programmingLanguages.length ||
      req.unknownTerms.length ||
      req.spokenLanguages.length ||
      req.regions.length ||
      req.seniority ||
      req.minYears != null,
  );
}

/**
 * A name, a phone number, an ID — Chana types those into the same box as a
 * requirement, and got "no candidates" because nothing there is a technology.
 * Anything short enough to be a detail rather than a job description is looked
 * up as it was typed, across everything we hold about a candidate: her fields
 * and the text of her CV.
 */
function directLookup(candidates: Candidate[], text: string): MatchResult[] {
  const q = text.trim();
  if (!q || q.length > 60 || q.includes("\n")) return [];
  const digits = q.replace(/\D/g, "");
  const byNumber = digits.length >= 5;
  const needle = normText(q);

  const hits: MatchResult[] = [];
  for (const c of candidates) {
    const identity = normText(
      [c.first_name, c.last_name, c.email, c.phone].filter(Boolean).join(" "),
    );
    const cv = normText(c.search_text ?? "");
    const inIdentity = byNumber
      ? identity.replace(/\D/g, "").includes(digits)
      : identity.includes(needle);
    const inCv = byNumber ? cv.replace(/\D/g, "").includes(digits) : cv.includes(needle);
    if (!inIdentity && !inCv) continue;
    let quote: string | undefined;
    if (!inIdentity) {
      const i = byNumber ? -1 : cv.indexOf(needle);
      if (i >= 0) quote = `…${cv.slice(Math.max(0, i - 70), i + needle.length + 70).replace(/\s+/g, " ").trim()}…`;
    }
    hits.push({
      candidate: c,
      score: inIdentity ? 100 : 70,
      reason: inIdentity
        ? `נמצאה לפי ${byNumber ? "מספר" : "שם"} במאגר`
        : "הפרט שחיפשת מופיע בתוך קורות החיים",
      matchedTechnologies: [],
      missingTechnologies: [],
      evidence: [inIdentity ? { term: q, source: "fields" } : { term: q, source: "cv", quote }],
      experienceMatch: false,
    });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Rank the whole database against a pasted requirement, and keep the matches. */
export function matchCandidates(
  candidates: Candidate[],
  requirementText: string,
  limit = 50,
): {
  requirement: ExtractedRequirement;
  results: MatchResult[];
  /** How many candidates matched, before the display limit. */
  relevantCount: number;
  /** True when nobody matched and the nearest few are shown instead. */
  fallback: boolean;
  /** True when the text was a detail (name / phone / ID), not a requirement. */
  lookup: boolean;
} {
  const requirement = extractRequirement(requirementText);

  // Nothing to rank against: treat what she typed as a detail to look up.
  if (!hasSignals(requirement)) {
    const found = directLookup(candidates, requirementText);
    return {
      requirement,
      results: found.slice(0, limit),
      relevantCount: found.length,
      fallback: false,
      lookup: true,
    };
  }
  const ranked = candidates
    .map((c) => scoreCandidate(c, requirement))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.score - a.score);

  const relevant = ranked.filter((r) => isRelevant(r, requirement));
  const fallback = relevant.length === 0 && ranked.length > 0;
  return {
    requirement,
    results: (fallback ? ranked.slice(0, 5) : relevant).slice(0, limit),
    relevantCount: relevant.length,
    fallback,
    lookup: false,
  };
}

export const EXPERIENCE_BUCKETS = EXPERIENCE_YEARS;
export const SENIORITY_LEVELS = SENIORITY;
