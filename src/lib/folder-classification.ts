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

/**
 * Experience phrasings that appear as folder names, mapped to our buckets.
 * Ordered longest-first so "מעל 10 שנים" is not swallowed by "מעל 1".
 */
const EXPERIENCE_PATTERNS: Array<[RegExp, string]> = [
  [/מעל\s*10|10\s*\+|יותר\s*מ-?\s*10/, "10+ שנים"],
  [/7\s*-\s*10|מעל\s*7/, "7-10 שנים"],
  [/מעל\s*5|5\s*-\s*7|5\s*\+/, "5-7 שנים"],
  [/3\s*-\s*5|מעל\s*3/, "3-5 שנים"],
  [/2\s*-\s*3|מעל\s*שנתיים/, "2-3 שנים"],
  [/1\s*-\s*2|שנה\s*-?\s*שנתיים/, "1-2 שנים"],
  [/עד\s*שנה|פחות\s*משנה/, "עד שנה"],
  [/ללא\s*ניסיון|ג['׳]וניור|מתחילות/, "ללא ניסיון"],
];

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

  let experienceYears: string | null = null;
  for (const segment of segments) {
    // An exact bucket name wins over a pattern guess.
    const exact = EXPERIENCE_YEARS.find((b) => segment.includes(b));
    if (exact) {
      experienceYears = exact;
      break;
    }
    const hit = EXPERIENCE_PATTERNS.find(([re]) => re.test(segment));
    if (hit) {
      experienceYears = hit[1];
      break;
    }
  }

  return {
    technologies: extracted.technologies,
    programmingLanguages: extracted.programmingLanguages,
    experienceYears,
    tags: segments,
  };
}
