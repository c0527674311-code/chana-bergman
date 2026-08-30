import {
  EXPERIENCE_YEARS,
  PROGRAMMING_LANGUAGES,
  REGIONS,
  SENIORITY,
  TECHNOLOGIES,
} from "@/lib/data/options";
import type { Candidate, MatchResult } from "@/lib/types";

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
  [/סטודנט|מתמח/i, "מתמחה"],
  [/בכיר|senior|סניור/i, "בכירה"],
  [/מנוס/i, "מנוסה"],
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // strip Hebrew niqqud
    .replace(/[.\-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEBREW = /[֐-׿]/;

/**
 * Whole-token containment.
 *
 * Two subtleties this has to get right:
 *  - `#` and `+` count as part of the token, otherwise the language "C"
 *    matches inside "C#" and "C++" and every C# CV looks like a C CV.
 *  - Hebrew terms take inseparable one-letter prefixes (ה/ב/ל/מ/ו/ש/כ), so
 *    "אזור המרכז" must still match the region "מרכז".
 */
function mentions(haystack: string, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = HEBREW.test(n) ? "[הבלמושכ]?" : "";
  return new RegExp(
    `(^|[^\\p{L}\\p{N}#+])${prefix}${escaped}([^\\p{L}\\p{N}#+]|$)`,
    "iu",
  ).test(haystack);
}

export type ExtractedRequirement = {
  technologies: string[];
  programmingLanguages: string[];
  seniority: string | null;
  region: string | null;
  minYears: number | null;
};

/** Pull structured requirements out of a free-text job description. */
export function extractRequirement(text: string): ExtractedRequirement {
  const h = norm(text);

  const technologies: string[] = TECHNOLOGIES.filter((t) => mentions(h, t));
  const programmingLanguages: string[] = PROGRAMMING_LANGUAGES.filter((l) => mentions(h, l));

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (!mentions(h, alias)) continue;
    if ((TECHNOLOGIES as readonly string[]).includes(canonical)) {
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

  const region = REGIONS.find((r) => mentions(h, r)) ?? null;

  // "3 שנות ניסיון" / "3+ years"
  const yearMatch =
    text.match(/(\d+)\s*\+?\s*(?:שנ(?:ות|ים|ה)|years?)/i) ??
    text.match(/(?:לפחות|minimum|min)\s*(\d+)/i);
  const minYears = yearMatch ? Number(yearMatch[1]) : null;

  return { technologies, programmingLanguages, seniority, region, minYears };
}

/** Lower bound of an experience bucket, for comparing against minYears. */
function bucketFloor(bucket: string | null): number {
  if (!bucket) return 0;
  const m = bucket.match(/(\d+)/);
  if (bucket.includes("ללא")) return 0;
  if (bucket.includes("עד שנה")) return 0;
  return m ? Number(m[1]) : 0;
}

const WEIGHTS = { tech: 5, lang: 6, seniority: 3, region: 2, years: 3, freshness: 1 };

/**
 * Score one candidate against an extracted requirement.
 * Returns null when there is no signal at all, so the caller can drop her.
 */
export function scoreCandidate(
  candidate: Candidate,
  req: ExtractedRequirement,
): MatchResult | null {
  const candTech = new Set((candidate.technologies ?? []).map(norm));
  const candLang = new Set((candidate.programming_languages ?? []).map(norm));

  const matchedTechnologies = req.technologies.filter((t) => candTech.has(norm(t)));
  const missingTechnologies = req.technologies.filter((t) => !candTech.has(norm(t)));
  const matchedLangs = req.programmingLanguages.filter((l) => candLang.has(norm(l)));
  const missingLangs = req.programmingLanguages.filter((l) => !candLang.has(norm(l)));

  let score = 0;
  let max = 0;

  if (req.technologies.length) {
    max += WEIGHTS.tech * req.technologies.length;
    score += WEIGHTS.tech * matchedTechnologies.length;
  }
  if (req.programmingLanguages.length) {
    max += WEIGHTS.lang * req.programmingLanguages.length;
    score += WEIGHTS.lang * matchedLangs.length;
  }

  if (req.seniority) {
    max += WEIGHTS.seniority;
    if (candidate.seniority === req.seniority) score += WEIGHTS.seniority;
  }

  if (req.region) {
    max += WEIGHTS.region;
    if (candidate.preferred_region === req.region || candidate.city === req.region) {
      score += WEIGHTS.region;
    }
  }

  if (req.minYears != null) {
    max += WEIGHTS.years;
    if (bucketFloor(candidate.experience_years) >= req.minYears) score += WEIGHTS.years;
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
    reason: buildReason(candidate, matchedLangs, matchedTechnologies, missingLangs.concat(missingTechnologies), req),
    matchedTechnologies: [...matchedLangs, ...matchedTechnologies],
    missingTechnologies: [...missingLangs, ...missingTechnologies],
  };
}

/** One human-readable line explaining the match — shown next to every result. */
function buildReason(
  c: Candidate,
  matchedLangs: string[],
  matchedTech: string[],
  missing: string[],
  req: ExtractedRequirement,
): string {
  const parts: string[] = [];
  const hits = [...matchedLangs, ...matchedTech];
  if (hits.length) parts.push(hits.join(", "));
  if (c.experience_years) parts.push(c.experience_years + " ניסיון");
  if (req.seniority && c.seniority === req.seniority) parts.push(c.seniority);
  if (req.region && (c.preferred_region === req.region || c.city === req.region)) {
    parts.push("אזור " + req.region);
  }
  let line = parts.length ? parts.join(" · ") : "התאמה חלקית";
  if (missing.length) line += ` · חסר: ${missing.slice(0, 3).join(", ")}`;
  return line;
}

/** Rank the whole database against a pasted requirement. */
export function matchCandidates(
  candidates: Candidate[],
  requirementText: string,
  limit = 50,
): { requirement: ExtractedRequirement; results: MatchResult[] } {
  const requirement = extractRequirement(requirementText);
  const results = candidates
    .map((c) => scoreCandidate(c, requirement))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { requirement, results };
}

export const EXPERIENCE_BUCKETS = EXPERIENCE_YEARS;
export const SENIORITY_LEVELS = SENIORITY;
