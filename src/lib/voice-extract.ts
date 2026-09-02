import { extractRequirement } from "@/lib/matching";
import {
  CITIES,
  EXPERIENCE_YEARS,
  INSTITUTIONS,
  REGIONS,
  SPOKEN_LANGUAGES,
} from "@/lib/data/options";
import type { Candidate } from "@/lib/types";

/**
 * Deterministic field extraction from a spoken-Hebrew transcript.
 *
 * Runs in the browser the moment the recording stops, so the form fills
 * instantly and works even when the model-based parser is unavailable
 * (no API key, offline, quota). When the server parse does succeed, its
 * results are merged on top of these.
 */

/** Words that follow a name-trigger but are never part of the name. */
const NAME_STOP = new Set([
  "בת",
  "גרה",
  "גר",
  "מ",
  "מתגוררת",
  "לומדת",
  "בוגרת",
  "עובדת",
  "יודעת",
  "מחפשת",
  "אני",
  "והטלפון",
  "הטלפון",
  "המייל",
  "ואני",
]);

const HEBREW_NUMBERS: Record<string, number> = {
  אחת: 1,
  שנתיים: 2,
  שלוש: 3,
  שלושה: 3,
  ארבע: 4,
  ארבעה: 4,
  חמש: 5,
  חמישה: 5,
  שש: 6,
  שישה: 6,
  שבע: 7,
  שבעה: 7,
  שמונה: 8,
  תשע: 9,
  עשר: 10,
};

function yearsToBucket(n: number): string {
  if (n <= 0) return EXPERIENCE_YEARS[0]; // ללא ניסיון
  if (n < 1) return "עד שנה";
  if (n <= 2) return "1-2 שנים";
  if (n <= 3) return "2-3 שנים";
  if (n <= 5) return "3-5 שנים";
  if (n <= 7) return "5-7 שנים";
  if (n <= 10) return "7-10 שנים";
  return "10+ שנים";
}

export function extractFromTranscript(transcript: string): Partial<Candidate> {
  const t = ` ${transcript.replace(/\s+/g, " ").trim()} `;
  const out: Partial<Candidate> = {};

  // --- Name: "שמי רחל כהן" / "קוראים לי..." / "השם שלי..." ------------------
  const nameMatch = t.match(
    /(?:שמי|קוראים לי|השם שלי הוא|השם שלי)\s+([א-ת'׳"-]{2,})(?:\s+([א-ת'׳"-]{2,}))?/,
  );
  if (nameMatch) {
    out.first_name = nameMatch[1];
    if (nameMatch[2] && !NAME_STOP.has(nameMatch[2])) out.last_name = nameMatch[2];
  }

  // --- Phone: any 05x/07x/02x-shaped digit run ------------------------------
  const phoneMatch = t.match(/0\d(?:[-\s]?\d){7,8}/);
  if (phoneMatch) out.phone = phoneMatch[0].replace(/\s+/g, "-");

  // --- Email: handle the spoken forms "שטרודל" and "נקודה" -----------------
  const emailSource = t
    .replace(/\s*(?:שטרודל|כרוכית)\s*/g, "@")
    .replace(/\s*נקודה\s*/g, ".");
  const emailMatch = emailSource.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z]{2,})+/);
  if (emailMatch) out.email = emailMatch[0].toLowerCase();

  // --- City & region (Hebrew prefixes: "מירושלים", "בבני ברק") -------------
  for (const city of CITIES) {
    if (city !== "אחר" && t.includes(city)) {
      out.city = city;
      break;
    }
  }
  for (const region of REGIONS) {
    if (t.includes(`אזור ה${region}`) || t.includes(`אזור ${region}`) || t.includes(`ב${region}`)) {
      out.preferred_regions = [region];
      break;
    }
  }

  // --- Experience: digits or Hebrew number words ----------------------------
  if (/ללא ניסיון|בלי ניסיון|אין לי ניסיון/.test(t)) {
    out.experience_years = "ללא ניסיון";
  } else if (/חצי שנה|פחות משנה/.test(t)) {
    out.experience_years = "עד שנה";
  } else if (/שנתיים/.test(t)) {
    out.experience_years = "1-2 שנים";
  } else {
    const digits = t.match(/(\d+)\s*שנ(?:ות|ים|ה)/);
    const words = t.match(
      /(אחת|שלוש|שלושה|ארבע|ארבעה|חמש|חמישה|שש|שישה|שבע|שבעה|שמונה|תשע|עשר)\s+שנ(?:ות|ים|ה)/,
    );
    const n = digits ? Number(digits[1]) : words ? HEBREW_NUMBERS[words[1]] : null;
    if (n != null) out.experience_years = yearsToBucket(n);
  }

  // --- Programming languages & technologies — reuse the matching engine's
  //     dictionary, which already maps Hebrew transliterations (ריאקט, ג'אווה).
  const req = extractRequirement(t);
  if (req.programmingLanguages.length) out.programming_languages = req.programmingLanguages;
  if (req.technologies.length) out.technologies = req.technologies;

  // --- Spoken languages -----------------------------------------------------
  const spoken = SPOKEN_LANGUAGES.filter((l) => t.includes(l));
  if (spoken.length) out.spoken_languages = spoken;

  // --- Institution ----------------------------------------------------------
  if (t.includes("וולף")) out.institution = "סמינר וולף";
  else if (t.includes("פרקטיקום")) out.institution = "פרקטיקום";
  else {
    const inst = INSTITUTIONS.find((i) => i !== "אחר" && t.includes(i));
    if (inst) out.institution = inst;
  }

  return out;
}
