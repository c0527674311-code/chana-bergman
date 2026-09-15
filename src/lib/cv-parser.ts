import Anthropic from "@anthropic-ai/sdk";
import { detectFormat, extractText, UnreadableFileError } from "@/lib/cv-text";
import { EXTRA_PROGRAMMING_LANGUAGES, EXTRA_TECHNOLOGIES } from "@/lib/data/tech-terms";
import {
  CITIES,
  EXPERIENCE_YEARS,
  INSTITUTIONS,
  PROGRAMMING_LANGUAGES,
  REGIONS,
  SENIORITY,
  SPOKEN_LANGUAGES,
  TECHNOLOGIES,
} from "@/lib/data/options";

/**
 * Extracts structured candidate fields from an uploaded CV.
 *
 * Hebrew CVs arrive as PDFs, Word files, plain text, or a photo of a printed
 * page taken on a phone. PDFs and images go straight to the model as native
 * document/image blocks (no OCR dependency); Word, RTF and ODT are turned into
 * text first (cv-text), since the API has no content block for them.
 */

const MODEL = process.env.CV_PARSER_MODEL ?? "claude-opus-4-8";

export type ParsedCv = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  preferred_region: string | null;
  programming_languages: string[];
  technologies: string[];
  spoken_languages: string[];
  role_types: string[];
  experience_years: string | null;
  seniority: string | null;
  institution: string | null;
  cohort_year: number | null;
  summary: string | null;
  /** Model's own confidence, so low-quality scans land in the review queue. */
  confidence: "high" | "medium" | "low";
};

/**
 * Constrains the model to our controlled vocabularies, so filters keep working.
 *
 * Nullable enums must be written as `anyOf: [{type,enum}, {type:"null"}]`.
 * The compact `type: ["string","null"]` + `enum` form is rejected outright —
 * "Enum value 'אילת' does not match declared type '['string','null']'" — which
 * made every single parse request fail with a 400 before this was fixed.
 */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    first_name: { type: ["string", "null"] },
    last_name: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    city: { anyOf: [{ type: "string", enum: [...CITIES] }, { type: "null" }] },
    preferred_region: { anyOf: [{ type: "string", enum: [...REGIONS] }, { type: "null" }] },
    // The extra terms are not offered in the candidate form, but a CV that
    // names COBOL, Priority or Selenium should still record it.
    programming_languages: {
      type: "array",
      items: { type: "string", enum: [...PROGRAMMING_LANGUAGES, ...EXTRA_PROGRAMMING_LANGUAGES] },
    },
    technologies: {
      type: "array",
      items: { type: "string", enum: [...TECHNOLOGIES, ...EXTRA_TECHNOLOGIES] },
    },
    spoken_languages: { type: "array", items: { type: "string", enum: [...SPOKEN_LANGUAGES] } },
    role_types: { type: "array", items: { type: "string" } },
    experience_years: { anyOf: [{ type: "string", enum: [...EXPERIENCE_YEARS] }, { type: "null" }] },
    seniority: { anyOf: [{ type: "string", enum: [...SENIORITY] }, { type: "null" }] },
    institution: { anyOf: [{ type: "string", enum: [...INSTITUTIONS] }, { type: "null" }] },
    cohort_year: { type: ["integer", "null"] },
    summary: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: [
    "first_name",
    "last_name",
    "email",
    "phone",
    "city",
    "preferred_region",
    "programming_languages",
    "technologies",
    "spoken_languages",
    "role_types",
    "experience_years",
    "seniority",
    "institution",
    "cohort_year",
    "summary",
    "confidence",
  ],
} as const;

const SYSTEM = `אתה מחלץ פרטים מקורות חיים של מתכנתות עבור מאגר גיוס בישראל.

כללים:
- קורות החיים בעברית או באנגלית. שמות פרטיים ומשפחה — החזר בעברית אם כך הם מופיעים.
- טלפון — החזר כפי שמופיע, כולל מקפים.
- בחר ערכים אך ורק מהרשימות המותרות בסכימה. אם אין התאמה טובה — החזר null (או מערך ריק).
- טכנולוגיות ושפות תכנות — רק כאלה שמוזכרות במפורש. אל תסיק "React" מ-"JavaScript".
- רשום *כל* טכנולוגיה ושפה שמוזכרות, לא רק את הבולטת. אם קורות החיים מזכירים
  ‎.NET Core‎, SQL Server ו-Angular — כל השלוש חייבות להופיע.
- מוצרי בסיס נתונים (SQL Server, PostgreSQL, MongoDB) ופריימוורקים (Angular,
  React, Django) שייכים ל-technologies. ב-programming_languages רק שפות ממש.
- experience_years — חשב מסך שנות הניסיון התעסוקתי בפועל, לא מגיל או משנות לימודים.
- cohort_year — שנת סיום הלימודים/הקורס אם מצוינת.
- summary — שורה אחת בעברית שמתארת את המועמדת (עד 25 מילים).
- confidence — "low" אם הקובץ מטושטש, חלקי, או שלא הצלחת לקרוא חלקים משמעותיים.`;

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("חסר ANTHROPIC_API_KEY — לא ניתן לנתח קורות חיים.");
  return new Anthropic({ apiKey });
}

type ContentBlock = Anthropic.ContentBlockParam;

/** Builds the right content block for what the file really is (see cv-text). */
async function buildContent(
  buffer: Buffer,
  fileName: string,
): Promise<{ blocks: ContentBlock[]; extractedText: string | null }> {
  const format = await detectFormat(buffer, fileName);
  const b64 = buffer.toString("base64");

  if (format.kind === "pdf") {
    return {
      blocks: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
      ],
      // Not sent to the model (it reads the PDF itself) — kept for search.
      extractedText: await extractText(buffer, format),
    };
  }

  if (format.kind === "image") {
    return {
      blocks: [{ type: "image", source: { type: "base64", media_type: format.mediaType, data: b64 } }],
      extractedText: null,
    };
  }

  // Word, RTF, ODT and plain text have no native content block — text first.
  const text = await extractText(buffer, format);
  if (!text) throw new UnreadableFileError("לא נמצא טקסט בקובץ — ייתכן שהוא ריק או סרוק כתמונה.");

  // Guard the context window on unusually long CVs.
  const clipped = text.slice(0, 120_000);
  return {
    blocks: [{ type: "text", text: `קורות חיים:\n\n${clipped}` }],
    extractedText: text,
  };
}

/**
 * Turns a failed parse into something Chana can act on.
 *
 * `fatal` stops a bulk import: when the Anthropic account is out of credit
 * every remaining file fails the same way, and the old import carried on
 * through the whole folder. `retryable` means the same file may work later.
 */
export function describeParseError(err: unknown): { message: string; retryable: boolean; fatal: boolean } {
  if (err instanceof UnreadableFileError) {
    return { message: err.message, retryable: false, fatal: false };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { message: "אין חיבור לשירות הקריאה. אפשר לנסות שוב.", retryable: true, fatal: false };
  }
  if (err instanceof Anthropic.APIError) {
    const detail = err.message ?? "";
    const status = err.status ?? 0;
    if (status === 400 && /credit balance/i.test(detail)) {
      return {
        message: "נגמר הקרדיט בחשבון Anthropic שקורא את קורות החיים. יש להוסיף קרדיט ואז להמשיך.",
        retryable: true,
        fatal: true,
      };
    }
    if (status === 401 || status === 403) {
      return { message: "מפתח ה-API של Anthropic לא תקין או בוטל.", retryable: true, fatal: true };
    }
    if (status === 429 || status >= 500) {
      return { message: "עומס זמני בשירות הקריאה. אפשר לנסות שוב בעוד דקה.", retryable: true, fatal: false };
    }
    if (status === 413 || /too large|too long|maximum/i.test(detail)) {
      return { message: "הקובץ ארוך מדי לקריאה אוטומטית.", retryable: false, fatal: false };
    }
    return { message: `הקריאה נכשלה: ${detail.slice(0, 160)}`, retryable: false, fatal: false };
  }
  const message = err instanceof Error ? err.message : "הקריאה נכשלה.";
  return { message, retryable: true, fatal: false };
}

export async function parseCv(
  buffer: Buffer,
  fileName: string,
  opts: { voice?: boolean } = {},
): Promise<{ parsed: ParsedCv; extractedText: string | null }> {
  const { blocks, extractedText } = await buildContent(buffer, fileName);
  const instruction = opts.voice
    ? "זהו תמלול של הקלטה קולית שבה מועמדת מספרת את פרטיה בעל פה. הטקסט דיבורי ולא ערוך — חלץ ממנו את הפרטים. שמות טכנולוגיות עשויים להופיע בתעתיק עברי (\"ריאקט\", \"ג'אווה\") — מפה אותם לערכים באנגלית מהרשימות המותרות. כתובת מייל: הרכב אותה מכל החלקים שנאמרו לפני \"שטרודל\" — אות באנגלית שנאמרה בעברית (\"סי\" = c, \"בי\" = b) היא חלק מהכתובת ואסור להשמיט אותה, ומקפים בין ספרות אינם חלק מהכתובת."
    : "חלץ את הפרטים מקורות החיים האלה.";

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
      // Measured on a CV naming .NET Core, SQL Server and Angular: at "low"
      // this call returned .NET Core three times and missed the other two,
      // and at "medium" it still missed them — the 16-field schema competes
      // for attention in a way an isolated extraction does not. "high" reads
      // the document correctly. This is the one call the whole database's
      // accuracy rests on, so it is worth the tokens.
      effort: "high",
    },
    messages: [
      {
        role: "user",
        content: [...blocks, { type: "text", text: instruction }],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("ניתוח הקובץ נדחה.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("לא התקבל פלט מהמנתח.");
  }

  const parsed = JSON.parse(textBlock.text) as ParsedCv;

  // The schema cannot express uniqueness — the API rejects `uniqueItems` — and
  // the model does repeat itself, so de-duplicate here. A repeated skill would
  // otherwise be counted more than once when ranking against a requirement.
  for (const key of [
    "programming_languages",
    "technologies",
    "spoken_languages",
    "role_types",
  ] as const) {
    const list = parsed[key];
    if (Array.isArray(list)) parsed[key] = [...new Set(list)];
  }

  return { parsed, extractedText };
}

/** Reasonable per-file cap so a stray 200-page PDF doesn't stall an import. */
export const MAX_PARSE_BYTES = 15 * 1024 * 1024;

export function parserConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
