import { EXPERIENCE_YEARS } from "@/lib/data/options";
import { extractRequirement } from "@/lib/matching";

/**
 * Chana's disk is already a classification.
 *
 * Her folders look like `מעל 5 שנים/ג'אווה/רבקה כהן.pdf` — the outer folder is
 * the experience band, the inner one is the field. That is hand-curated
 * knowledge she built over years, and it is often more reliable than what the
 * CV itself says: a CV rarely writes "5+ years" anywhere, but she filed it
 * under that heading because she knows.
 *
 * So the path is read as data, not decoration. Technology names go through the
 * same extractor the requirement search uses, which already resolves Hebrew
 * spellings ("ג'אווה" → Java, "אנגולר" → Angular).
 */

export type FolderClassification = {
  /** Canonical technologies named by folders along the path. */
  technologies: string[];
  /** Canonical programming languages named by folders along the path. */
  programmingLanguages: string[];
  /** An EXPERIENCE_YEARS bucket, when a folder states one. */
  experienceYears: string | null;
  /** Every folder segment, kept verbatim as tags so nothing she encoded is lost. */
  tags: string[];
};

/** Bucket floors, highest first: "at least N years" lands in the bucket N falls in. */
const BUCKET_FLOORS: Array<[number, string]> = [
  [10, "10+ שנים"],
  [7, "7-10 שנים"],
  [5, "5-7 שנים"],
  [3, "3-5 שנים"],
  [2, "2-3 שנים"],
  [1, "1-2 שנים"],
];

function bucketFor(years: number): string {
  return BUCKET_FLOORS.find(([floor]) => years >= floor)?.[1] ?? "עד שנה";
}

/** The ranges that are experience even without the word "שנים" after them. */
const BUCKET_RANGES = new Set(["1-2", "2-3", "3-5", "5-7", "7-10"]);

/** A number of years: digits, or the two Hebrew words folders use for 1 and 2. */
const YEARS = String.raw`(\d{1,2}(?![\d.])|שנתיים|שנה(?!\p{L}))`;
const toYears = (s: string) => (s === "שנתיים" ? 2 : s === "שנה" ? 1 : Number(s));

/** "At least N years" phrasings: מעל 5, יותר מ-5, לפחות 5, 5+, +5, 5 שנים ומעלה. */
const AT_LEAST: RegExp[] = [
  new RegExp(String.raw`(?:מעל|יותר\s*מ|לפחות)\s*-?\s*${YEARS}`, "u"),
  /(?<![\d.])(\d{1,2})\s*\+/u,
  /\+\s*(\d{1,2})(?![\d.])/u,
  new RegExp(String.raw`(?<![\d.])${YEARS}\s*(?:שנים|שנות)?\s*(?:ו?מעלה|ויותר)`, "u"),
];

/**
 * Digits that belong to a date or a year span — "2021-2022", "11-2020",
 * "2017-10", "3-5-2020", "1.2.2021". A folder named after a cohort or a date
 * used to be read as "1-2 שנים" or "7-10 שנים".
 */
const DATE_LIKE =
  /\d+(?:\s*[-–./]\s*\d+){2,}|\d{3,}(?:\s*[-–./]\s*\d+)+|\d+(?:\s*[-–./]\s*\d{3,})+/g;

function experienceFromSegment(segment: string): string | null {
  // An exact bucket name wins over a pattern guess.
  const exact = EXPERIENCE_YEARS.find((b) =>
    new RegExp(`(?<![\\d.\\-–])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(segment),
  );
  if (exact) return exact;

  const s = segment.replace(DATE_LIKE, " ");

  for (const re of AT_LEAST) {
    const m = s.match(re);
    if (m) return bucketFor(toYears(m[1]));
  }

  // "3-5", "7-10", or any range followed by the word "שנים". "21-22" is neither.
  const range = s.match(/(?<![\d.])(\d{1,2})\s*[-–]\s*(\d{1,2})(?![\d.])(\s*שנ(?:ים|ות))?/u);
  if (range) {
    const [from, to] = [Number(range[1]), Number(range[2])];
    if (from < to && (range[3] || BUCKET_RANGES.has(`${from}-${to}`))) return bucketFor(from);
  }

  if (/שנה\s*-?\s*שנתיים/.test(s)) return "1-2 שנים";
  if (/עד\s*שנה|פחות\s*משנה/.test(s)) return "עד שנה";
  if (/ללא\s*ניסיון|ג['׳]וניור|מתחילות/.test(s)) return "ללא ניסיון";
  return null;
}

export function classifyFromPath(relativePath: string): FolderClassification {
  const empty: FolderClassification = {
    technologies: [],
    programmingLanguages: [],
    experienceYears: null,
    tags: [],
  };
  if (!relativePath) return empty;

  // Drop the file itself — only the folders above it carry the classification.
  const segments = relativePath
    .split("/")
    .slice(0, -1)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) return empty;

  // Feed the folder names to the requirement extractor as one line. It already
  // handles aliases and stops "SQL Server" from also reporting a bare "SQL".
  const extracted = extractRequirement(segments.join(" , "));

  // A bare "QA" folder holds testers of every kind. The extractor reads "QA"
  // as QA Automation — reasonable in an employer's requirement — but filing
  // manual testers under automation sends them to the wrong jobs. There is no
  // manual-QA technology to map to, so plain QA stays a tag only.
  const technologies = extracted.technologies.filter(
    (t) => t !== "QA Automation" || segments.some((s) => /automation|אוטומציה/i.test(s)),
  );

  let experienceYears: string | null = null;
  for (const segment of segments) {
    experienceYears = experienceFromSegment(segment);
    if (experienceYears) break;
  }

  return {
    technologies,
    programmingLanguages: extracted.programmingLanguages,
    experienceYears,
    tags: segments,
  };
}
