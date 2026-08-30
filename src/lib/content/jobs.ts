import type { JobPosting } from "@/lib/types";

/**
 * Sample job postings, shown while the requirements table has no public rows.
 * Once Chana marks real requirements as "ציבורית" in the back-office, the
 * database wins and these disappear.
 */
export const SEED_JOBS: JobPosting[] = [
  {
    id: "seed-job-1",
    title: "מפתחת Full Stack — ‎.NET + React",
    public_slug: "fullstack-dotnet-react",
    public_description:
      "לחברת תוכנה יציבה במרכז דרושה מפתחת Full Stack לצוות קטן ומשפחתי.\n\nמה תעשי אצלנו:\n- פיתוח מערכת ליבה עסקית ב-C#‎ ו-.NET מצד השרת\n- בניית מסכים חדשים ב-React מצד הלקוח\n- עבודה צמודה עם אשת המוצר — מהאפיון ועד הפרודקשן\n\nמה חשוב שיהיה לך:\n- שנתיים ומעלה ניסיון בפיתוח ‎.NET\n- ניסיון ב-React או נכונות אמיתית ללמוד\n- ראש גדול ורצון לצמוח",
    required_technologies: [".NET", "React", "SQL Server"],
    seniority: "מנוסה",
    region: "מרכז",
    job_scope: ["משרה מלאה", "היברידי"],
    created_at: "2026-08-27",
  },
  {
    id: "seed-job-2",
    title: "מפתחת Java ג'וניורית — הזדמנות ראשונה אמיתית",
    public_slug: "junior-java",
    public_description:
      "צוות פיתוח בירושלים מגייס ג'וניורית עם רצון ללמוד — בלי דרישת ניסיון תעסוקתי.\n\nמה תקבלי:\n- ליווי צמוד של מפתחת בכירה בחצי השנה הראשונה\n- עבודה על מערכת אמיתית בפרודקשן מהשבוע הראשון\n- מסלול קידום מסודר\n\nמה חשוב שיהיה לך:\n- בסיס חזק ב-Java (בוגרת פרקטיקום / הנדסאית)\n- הכרות עם SQL\n- מוטיבציה גבוהה",
    required_technologies: ["Java", "Spring Boot", "SQL"],
    seniority: "ג'וניורית",
    region: "ירושלים",
    job_scope: ["משרה מלאה"],
    created_at: "2026-08-25",
  },
  {
    id: "seed-job-3",
    title: "בודקת QA אוטומציה",
    public_slug: "qa-automation",
    public_description:
      "לחברת הייטק בבני ברק דרושה בודקת אוטומציה לצוות איכות מוביל.\n\nמה תעשי אצלנו:\n- כתיבת בדיקות אוטומטיות ב-Selenium וב-Playwright\n- בניית תשתית בדיקות חדשה יחד עם ראשת הצוות\n- עבודה מול צוותי הפיתוח בשיטת Agile\n\nמה חשוב שיהיה לך:\n- שנה ומעלה ניסיון באוטומציה, או ידני + קורס אוטומציה\n- יכולת כתיבת קוד בסיסית (Java / Python / JS)",
    required_technologies: ["QA Automation", "Selenium", "JavaScript"],
    seniority: "מנוסה",
    region: "מרכז",
    job_scope: ["משרה מלאה", "משרה חלקית"],
    created_at: "2026-08-24",
  },
  {
    id: "seed-job-4",
    title: "מפתחת React — עבודה מרחוק",
    public_slug: "react-remote",
    public_description:
      "סטארטאפ צומח מחפש מפתחת Front End חזקה — עבודה מלאה מהבית.\n\nמה תעשי אצלנו:\n- פיתוח מוצר SaaS ב-React ו-TypeScript\n- עבודה עם מעצבת UX צמודה\n- השפעה אמיתית על המוצר — צוות קטן, אחריות גדולה\n\nמה חשוב שיהיה לך:\n- 3+ שנות ניסיון ב-React\n- TypeScript ברמה גבוהה\n- משמעת עצמית לעבודה מרחוק",
    required_technologies: ["React", "TypeScript", "Next.js"],
    seniority: "בכירה",
    region: "עבודה מרחוק",
    job_scope: ["משרה מלאה", "עבודה מרחוק"],
    created_at: "2026-08-21",
  },
  {
    id: "seed-job-5",
    title: "ראשת צוות פיתוח — ‎.NET",
    public_slug: "team-lead-dotnet",
    public_description:
      "ארגון תוכנה גדול מגייס ראשת צוות לצוות של חמש מפתחות.\n\nמה תעשי אצלנו:\n- הובלה מקצועית וניהולית של הצוות\n- תכנון ספרינטים מול ההנהלה\n- 30% פיתוח hands-on, 70% הובלה\n\nמה חשוב שיהיה לך:\n- 5+ שנות ניסיון בפיתוח ‎.NET\n- ניסיון קודם בהובלה — פורמלי או לא פורמלי\n- יחסי אנוש מעולים",
    required_technologies: [".NET", "SQL Server", "Azure"],
    seniority: "ראשת צוות",
    region: "מרכז",
    job_scope: ["משרה מלאה", "היברידי"],
    created_at: "2026-08-18",
  },
  {
    id: "seed-job-6",
    title: "מפתחת Python / Data",
    public_slug: "python-data",
    public_description:
      "חברה בתחום הפינטק מחפשת מפתחת Python עם נטייה לדאטה.\n\nמה תעשי אצלנו:\n- פיתוח שירותי backend ב-Python\n- בניית pipelines לעיבוד נתונים\n- עבודה עם צוות ה-Data Science על מודלים בפרודקשן\n\nמה חשוב שיהיה לך:\n- שנתיים+ ניסיון ב-Python\n- SQL ברמה טובה\n- יתרון: ניסיון עם Docker או ענן",
    required_technologies: ["Python", "PostgreSQL", "Docker"],
    seniority: "מנוסה",
    region: "מרכז",
    job_scope: ["משרה מלאה", "היברידי"],
    created_at: "2026-08-15",
  },
];

export function findSeedJob(slug: string): JobPosting | undefined {
  return SEED_JOBS.find((j) => j.public_slug === slug || j.id === slug);
}
