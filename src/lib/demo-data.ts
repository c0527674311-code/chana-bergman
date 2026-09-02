import type { Candidate } from "@/lib/types";

/**
 * Sample database used only when Supabase is not configured, so the back-office
 * and the matching engine can be reviewed and demoed before the real import.
 * Never used once NEXT_PUBLIC_SUPABASE_URL is set.
 */
function c(
  i: number,
  first: string,
  last: string,
  langs: string[],
  tech: string[],
  years: string,
  seniority: string,
  city: string,
  region: string,
  institution: string,
  cohort: number,
  notes = "",
): Candidate {
  const monthsAgo = (i * 37) % 26;
  const updated = new Date(Date.UTC(2026, 7, 28) - monthsAgo * 30 * 864e5).toISOString();
  return {
    id: `demo-${i}`,
    user_id: null,
    first_name: first,
    last_name: last,
    email: `candidate${i}@example.com`,
    phone: `05${(i % 9) + 1}${String(1000000 + i * 7919).slice(0, 7)}`,
    city,
    preferred_regions: [region],
    spoken_languages: i % 3 === 0 ? ["עברית", "אנגלית"] : ["עברית"],
    programming_languages: langs,
    technologies: tech,
    role_types: [],
    experience_years: years,
    seniority,
    job_scope: i % 4 === 0 ? ["משרה חלקית", "היברידי"] : ["משרה מלאה"],
    institution,
    cohort_year: cohort,
    notes_from_candidate: notes,
    notes_internal: null,
    contact_before_sending: i % 5 === 0,
    status: i % 11 === 0 ? "placed" : "active",
    source: i % 3 === 0 ? "import_disk" : i % 3 === 1 ? "site" : "import_csv",
    tags: cohort >= 2024 ? ["פרקטיקום"] : [],
    consent_marketing: i % 7 !== 0,
    unsubscribed_at: null,
    created_at: updated,
    updated_at: updated,
  };
}

export const DEMO_CANDIDATES: Candidate[] = [
  c(1, "שירה", "לוי", ["C#", "SQL"], [".NET", "ASP.NET", "SQL Server"], "3-5 שנים", "מנוסה", "ירושלים", "ירושלים", "סמינר וולף", 2021),
  c(2, "מרים", "כהן", ["Java", "SQL"], ["Spring Boot", "PostgreSQL", "Docker"], "5-7 שנים", "בכירה", "בני ברק", "מרכז", "פרקטיקום", 2019),
  c(3, "אסתי", "פרידמן", ["JavaScript", "TypeScript"], ["React", "Node.js", "Next.js"], "2-3 שנים", "מנוסה", "פתח תקווה", "מרכז", "פרקטיקום", 2023),
  c(4, "רבקה", "שטרן", ["Python"], ["Django", "PostgreSQL", "Machine Learning"], "3-5 שנים", "מנוסה", "חיפה", "צפון", "מכון לב", 2021),
  c(5, "חני", "וייס", ["C#"], [".NET Core", "Angular", "SQL Server"], "1-2 שנים", "ג'וניורית", "אשדוד", "דרום", "סמינר וולף", 2024),
  c(6, "יעל", "ברוך", ["Java"], ["Spring", "Kafka", "Microservices", "Kubernetes"], "7-10 שנים", "ראשת צוות", "רמת גן", "מרכז", "אוניברסיטה", 2016),
  c(7, "נחמה", "גולד", ["JavaScript"], ["React", "React Native", "REST API"], "2-3 שנים", "מנוסה", "מודיעין", "מרכז", "פרקטיקום", 2023),
  c(8, "שרה", "אדלר", ["Python", "SQL"], ["Data Engineering", "BI", "Power BI"], "3-5 שנים", "מנוסה", "ירושלים", "ירושלים", "מכללת בית יעקב", 2021),
  c(9, "דבורה", "רוזן", ["C#", "JavaScript"], [".NET", "React", "Azure"], "5-7 שנים", "בכירה", "בית שמש", "ירושלים", "סמינר וולף", 2018),
  c(10, "מלכי", "הירש", [], ["QA Automation", "Selenium", "Cypress"], "1-2 שנים", "ג'וניורית", "בני ברק", "מרכז", "פרקטיקום", 2024),
  c(11, "טובה", "לנדאו", ["Java", "Kotlin"], ["Android", "Spring Boot"], "3-5 שנים", "מנוסה", "חיפה", "צפון", "אוניברסיטה", 2020),
  c(12, "רחלי", "פישר", ["TypeScript"], ["Angular", "Node.js", "MongoDB"], "2-3 שנים", "מנוסה", "נתניה", "שרון", "ג'ון ברייס", 2023),
  c(13, "בתיה", "מרגלית", ["Python"], ["FastAPI", "Docker", "AWS", "DevOps"], "5-7 שנים", "בכירה", "תל אביב-יפו", "מרכז", "אוניברסיטה", 2018),
  c(14, "אודליה", "בן דוד", ["C#"], [".NET", "SQL Server", "Priority"], "10+ שנים", "ראשת צוות", "ראשון לציון", "מרכז", "מכללת אונו", 2013),
  c(15, "שיינא", "קליין", ["JavaScript"], ["React", "HTML/CSS", "Next.js"], "עד שנה", "ג'וניורית", "ירושלים", "ירושלים", "פרקטיקום", 2025),
  c(16, "פרידא", "שוורץ", ["Java"], ["Spring Boot", "PostgreSQL", "REST API"], "1-2 שנים", "ג'וניורית", "אשקלון", "דרום", "פרקטיקום", 2024),
  c(17, "מיכל", "אורן", ["Python", "R"], ["Machine Learning", "Deep Learning"], "3-5 שנים", "מנוסה", "רחובות", "שפלה", "אוניברסיטה", 2021),
  c(18, "נעמי", "גרוס", ["C++", "C"], ["Embedded"], "7-10 שנים", "בכירה", "חיפה", "צפון", "אוניברסיטה", 2016),
  c(19, "אביגיל", "רוט", ["TypeScript", "JavaScript"], ["React", "Node.js", "GraphQL", "AWS"], "5-7 שנים", "ראשת צוות", "רעננה", "שרון", "מכללת אונו", 2018),
  c(20, "חיה", "זילבר", ["SQL"], ["BI", "Tableau", "SQL Server"], "2-3 שנים", "מנוסה", "בני ברק", "מרכז", "מכללת בית יעקב", 2022),
  c(21, "לאה", "פוקס", ["C#"], [".NET Core", "Azure", "CI/CD", "DevOps"], "3-5 שנים", "מנוסה", "ירושלים", "עבודה מרחוק", "סמינר וולף", 2020),
  c(22, "רייזי", "אקשטיין", ["JavaScript"], ["Vue", "Node.js", "MySQL"], "1-2 שנים", "ג'וניורית", "בית שמש", "ירושלים", "פרקטיקום", 2024),
  c(23, "גילה", "נוימן", ["Java", "Scala"], ["Kafka", "Elasticsearch", "Microservices"], "7-10 שנים", "ארכיטקטית", "תל אביב-יפו", "מרכז", "אוניברסיטה", 2015),
  c(24, "תמר", "וינברג", ["Python"], ["Django", "Cyber Security", "Docker"], "3-5 שנים", "מנוסה", "מודיעין", "מרכז", "מכון לב", 2021),
];

export const DEMO_MODE_NOTICE =
  "נתוני הדגמה — המערכת עדיין לא חוברה למסד הנתונים. ראי README להגדרת Supabase.";
