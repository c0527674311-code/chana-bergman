/**
 * Canonical option lists for candidate profile fields and admin filters.
 *
 * The city list is carried over from the existing chana-bergman.co.il site so
 * that historical records keep matching, with two fixes: the typo "ירשולים"
 * was dropped in favour of "ירושלים", and "גאולים"/"מושב גאולים" collapsed.
 */

export const REGIONS = ["צפון", "מרכז", "דרום", "ירושלים", "שרון", "שפלה", "עבודה מרחוק"] as const;

export const CITIES = [
  "אילת",
  "אריאל",
  "אשדוד",
  "אשקלון",
  "באר שבע",
  "בני ברק",
  "בת ים",
  "גבעתיים",
  "הרצליה",
  "חדרה",
  "חולון",
  "חיפה",
  "טבריה",
  "ירושלים",
  "כפר יונה",
  "כפר סבא",
  "לוד",
  "מגדל העמק",
  "מודיעין",
  "מושב גאולים",
  "מעלה אדומים",
  "נהריה",
  "נצרת",
  "נתניה",
  "פתח תקווה",
  "צפת",
  "קריית ביאליק",
  "קריית שמונה",
  "ראש העין",
  "ראשון לציון",
  "רחובות",
  "רמת גן",
  "רעננה",
  "תל אביב-יפו",
  "אחר",
] as const;

/** Programming languages — the primary "מתמחה בשפת תכנות" filter. */
export const PROGRAMMING_LANGUAGES = [
  "C#",
  "Java",
  "JavaScript",
  "TypeScript",
  "Python",
  "C++",
  "C",
  "PHP",
  "Go",
  "Ruby",
  "Kotlin",
  "Swift",
  "Rust",
  "Scala",
  "SQL",
  "R",
  "MATLAB",
  "VB.NET",
  "ABAP",
  "Objective-C",
  "Dart",
  "Perl",
] as const;

/** Technologies / frameworks — the "מתמחה בטכנולוגיית" filter. */
export const TECHNOLOGIES = [
  ".NET",
  ".NET Core",
  "ASP.NET",
  "Angular",
  "React",
  "React Native",
  "Vue",
  "Next.js",
  "Node.js",
  "Express",
  "Spring",
  "Spring Boot",
  "Django",
  "Flask",
  "FastAPI",
  "Laravel",
  "Flutter",
  "Android",
  "iOS",
  "SQL Server",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "CI/CD",
  "Jenkins",
  "Git",
  "GraphQL",
  "REST API",
  "Microservices",
  "Kafka",
  "RabbitMQ",
  "Selenium",
  "Cypress",
  "Jest",
  "QA Automation",
  "Machine Learning",
  "Deep Learning",
  "Data Engineering",
  "BI",
  "Power BI",
  "Tableau",
  "Cyber Security",
  "DevOps",
  "Embedded",
  "Salesforce",
  "SAP",
  "Priority",
  "Unity",
  "WordPress",
  "HTML/CSS",
] as const;

export const SPOKEN_LANGUAGES = [
  "עברית",
  "אנגלית",
  "רוסית",
  "צרפתית",
  "ספרדית",
  "ערבית",
  "יידיש",
  "אמהרית",
  "גרמנית",
  "פורטוגזית",
] as const;

/** Buckets rather than free numbers — keeps the filter usable. */
export const EXPERIENCE_YEARS = [
  "ללא ניסיון",
  "עד שנה",
  "1-2 שנים",
  "2-3 שנים",
  "3-5 שנים",
  "5-7 שנים",
  "7-10 שנים",
  "10+ שנים",
] as const;

export const SENIORITY = ["ג'וניורית", "מתמחה", "מנוסה", "בכירה", "ראשת צוות", "ארכיטקטית"] as const;

export const JOB_SCOPE = ["משרה מלאה", "משרה חלקית", "היברידי", "עבודה מרחוק", "פרילנס", "סטודנטית"] as const;

export const ROLE_TYPES = [
  "פיתוח Full Stack",
  "פיתוח Front End",
  "פיתוח Back End",
  "פיתוח Mobile",
  "QA ידני",
  "QA אוטומציה",
  "DevOps",
  "Data / BI",
  "Data Science",
  "Machine Learning",
  "Cyber",
  "Embedded",
  "אינטגרציה",
  "תמיכה טכנית",
  "ניהול מוצר",
  "UI/UX",
  "ראשת צוות פיתוח",
] as const;

/** Institutions Chana recruits from — drives the cohort ("שנתון") segmentation. */
export const INSTITUTIONS = [
  "סמינר וולף",
  "פרקטיקום",
  "מכללת בית יעקב",
  "מכון לב",
  "מכללת אונו",
  "הדסה",
  "ג'ון ברייס",
  "סמינר אחר",
  "אוניברסיטה",
  "אחר",
] as const;

export const CANDIDATE_STATUS = [
  { value: "active", label: "פעילה — מחפשת" },
  { value: "passive", label: "לא מחפשת כרגע" },
  { value: "placed", label: "הושמה" },
  { value: "archived", label: "לא רלוונטית" },
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  site: "טופס באתר",
  import_disk: "ייבוא מהדיסק",
  import_csv: "ייבוא רשימה / סמוב",
  email: "מייל נכנס",
  manual: "הזנה ידנית",
  referral: "הפניה",
};

/** Earliest cohort offered. The imported archive reaches back to 2006. */
export const FIRST_COHORT_YEAR = 2000;

/**
 * Cohort years for the "שנתון" segmentation, newest first: next year's class
 * (students register before they graduate) back to FIRST_COHORT_YEAR. A fixed
 * 12-year window hid every candidate from before 2014.
 */
export function cohortYears(now = new Date()): number[] {
  const newest = now.getFullYear() + 1;
  return Array.from({ length: newest - FIRST_COHORT_YEAR + 1 }, (_, i) => newest - i);
}

export type Region = (typeof REGIONS)[number];
export type Seniority = (typeof SENIORITY)[number];
