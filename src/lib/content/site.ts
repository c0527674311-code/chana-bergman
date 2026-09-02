/**
 * Site copy, in one place so Chana can edit wording without touching layout.
 *
 * Voice follows the Sky Branding strategy: the hook word is "בדיוק", the
 * tagline is "Bדיוק מה שחיפשת." and the values are
 * דיוק ומקצוענות · איכות וטכנולוגיה · אמינות ושקיפות.
 *
 * Note on gender: candidates are addressed in the feminine throughout (the
 * brand is השמת עובדות בהייטק and every Figma screen uses feminine forms);
 * employers are addressed in the plural/neutral.
 */

export const BRAND = {
  name: "חנה ברגמן",
  nameEn: "CHANA BERGMAN",
  tagline: "Bדיוק מה שחיפשת.",
  /** The lock-up line that sits under the wordmark in the brand asset. */
  discipline: "השמה מדויקת בהייטק",
  values: ["דיוק ומקצוענות", "איכות וטכנולוגיה", "אמינות ושקיפות"],
  yearsOfReputation: 20,
} as const;

/**
 * Short nav — only real destinations.
 * אודות / איך זה עובד / המלצות הם סקשנים בעמוד הבית, ולכן לא בתפריט:
 * מי שגולל בעמוד הבית מגיע אליהם ממילא.
 */
export const NAV = [
  { href: "/", label: "בית" },
  { href: "/jobs", label: "משרות" },
  { href: "/cv-builder", label: "בונה קו״ח" },
  { href: "/blog", label: "טיפים" },
  { href: "/#contact", label: "צור קשר" },
] as const;

/**
 * Homepage copy — speaks to CANDIDATES (women uploading CVs).
 * The employer pitch lives entirely on /employers.
 */
export const HOME = {
  hero: {
    titleLines: ["השמה מדויקת", "בהייטק"],
    lead: "היכרות אישית, מאגר משרות מהחברות המובילות במשק, והתאמה שנתפרה בדיוק עלייך. כל מה שנשאר לך — להעלות קורות חיים.",
    cta: "אני רוצה להעלות קובץ קורות חיים",
    ctaSecondary: "לצפייה במשרות",
  },
  logosTitle: "החברות שמגייסות דרכנו",
  howItWorks: {
    kickerEn: ["How does it ", "work", "?"],
    subtitle: "תהליך פשוט, מהיר ומדויק — ואנחנו עושות בשבילך את העבודה",
    /** `cta` turns a step card into a link to the action it describes. */
    steps: [
      {
        title: "נרשמות לאתר",
        body: "פרופיל אישי בדקה. הפרטים נשמרים, ואפשר לעדכן אותם בכל רגע.",
      },
      {
        title: "מעלות קורות חיים",
        body: "PDF, Word, צילום מהנייד — או פשוט מקליטות. המערכת קוראת וממלאת את הפרטים בשבילך.",
        cta: { href: "/submit-cv", label: "להעלאת קורות חיים" },
      },
      {
        title: "מתעדכנות לפני כל שליחה",
        body: "שום דבר לא נשלח למעסיק בלי שידעת. תמיד שואלים אותך קודם.",
      },
    ] as const,
  },
  about: {
    kickerEn: ["About ", "me"],
    name: "חנה ברגמן",
    paragraphs: [
      "מעל 20 שנה שאני מלווה בוגרות של המסלולים הטכנולוגיים אל החברות המובילות במשק — אלפי השמות מוצלחות, אחת אחת, בהיכרות אישית.",
      "אני לא עובדת עם מאגר אנונימי. אני מכירה את המועמדות שלי: את המסלול שעברת, את מה שאת באמת יודעת לעשות, ואת מה שמתאים לך. ובצד השני — אני מכירה את החברות ואת מה שכל צוות באמת מחפש.",
      "בעזרת מערכת חכמה שפיתחנו, ההתאמה נעשית מהירה ומדויקת מתמיד: בלי בזבוז זמן, בלי ראיונות סרק, ובלי משרות שלא בשבילך.",
    ],
    jobsQuestion: "רוצה למצוא את המשרה המדויקת עבורך בהייטק?",
    jobsCaption: "כל מה שדרוש זה להעלות קובץ קורות חיים — ואנחנו כבר נעשה בשבילך את העבודה.",
    cta: "לחצי כאן להעלאת קו״ח",
  },
  recommendations: {
    kickerEn: ["Recom", "mendations"],
  },
  contact: {
    marquee: "CONTACT US",
    titleMarked: "שאלות?",
    titleRest: " תמיד תוכלי לפנות אלינו!",
    subtitle: "מלאי פרטים בטופס ונשוב אלייך בהקדם :)",
    submit: "אשמח שתחזרו אלי",
  },
} as const;

/** Role-tag chips scrolling under "About me". */
export const ROLE_CHIPS = [
  "Fullstack Developer",
  "React Frontend",
  "Node.js Backend",
  "QA Automation",
  "UX\\UI Design",
  "Data Analyst",
  "DevOps",
  "Mobile Developer",
] as const;

/** FAQ — shown on the employers page. */
export const FAQ = [
  {
    q: "כמה זמן לוקח לקבל מועמדות?",
    a: "ברוב המקרים אנחנו חוזרות עם רשימה ראשונית תוך יום עסקים. אם הדרישה נישתית במיוחד — נעדכן אתכם מראש.",
  },
  {
    q: "מה העלות?",
    a: "עמלת השמה נגבית רק על מועמדת שנקלטה בפועל. אין תשלום על חיפוש, על ראיונות, או על מועמדות שלא התאימו.",
  },
  {
    q: "אנחנו מקבלים המון קורות חיים לא רלוונטיים ממקורות אחרים.",
    a: "זה בדיוק ההבדל. אנחנו לא שולחות כמות — אנחנו שולחות רק את מי שבאמת עונה על הדרישה, עם שורת הסבר למה היא מתאימה.",
  },
  {
    q: "אפשר לשלוח את מסמך הדרישות כמו שהוא?",
    a: "כן, וזו הדרך המועדפת. מעלים את הקובץ בטופס ואנחנו עושות את השאר.",
  },
] as const;

/**
 * ⚠️ ציטוטים לדוגמה — להחליף באמיתיים עם שם ותפקיד לפני עלייה לאוויר.
 * מעורבים: המלצות של מעסיקים ושל מועמדות, כי שני הקהלים קוראים אותן.
 */
export const TESTIMONIALS = [
  {
    quote: "קיבלנו ארבע מועמדות. שלוש מהן היו רלוונטיות באמת, ואחת נקלטה תוך שבועיים.",
    role: "מנהלת גיוס, חברת תוכנה",
  },
  {
    quote:
      "מה שמייחד את חנה זה שהיא מכירה את הבנות אישית. היא לא שולחת קורות חיים — היא ממליצה על אדם.",
    role: "VP R&D",
  },
  {
    quote: "פניתי בבוקר עם דרישה, ובצהריים כבר היו לי קורות חיים מסודרים בתיבה.",
    role: "ראש צוות פיתוח",
  },
  {
    quote:
      "סיימתי פרקטיקום בלי ניסיון תעסוקתי והייתי בטוחה שאף אחד לא יסתכל עליי. חנה מצאה לי משרה ראשונה תוך חודש.",
    role: "מפתחת Full Stack, בוגרת פרקטיקום",
  },
  {
    quote:
      "הגיעו אליי רק משרות שבאמת התאימו לי — לא הצפה של מודעות אקראיות. הרגשתי שמישהי באמת קראה את קורות החיים שלי.",
    role: "מפתחת Front End",
  },
  {
    quote:
      "אחרי שנים של גיוס דרך לוחות משרות, זו הפעם הראשונה שקיבלנו רשימה שלא היינו צריכים לסנן. חסכה לנו שבועות.",
    role: "CTO, חברת פינטק",
  },
  {
    quote: "חנה ליוותה אותי לאורך כל התהליך, גם בהכנה לראיון הטכני. זה לא שירות — זה יחס אישי.",
    role: "מפתחת ‎.NET",
  },
  {
    quote:
      "גייסנו דרכה שלוש מפתחות בשנה האחרונה. כולן עדיין אצלנו, וכולן מצוינות. זה המדד היחיד שמעניין אותי.",
    role: "מנהל פיתוח, חברת תוכנה",
  },
] as const;

export const CANDIDATE_CTA = {
  title: "מחפשת את המשרה הבאה שלך?",
  body: "השאירי קורות חיים פעם אחת, ותהיי במאגר שמנהלי הגיוס בחברות המובילות פונים אליו. בלי לרדוף אחרי מודעות.",
  cta: "שליחת קורות חיים",
} as const;

export const FOOTER = {
  blurb:
    "השמת מתכנתות בחברות ההייטק המובילות בישראל. התאמה מדויקת בין הדרישות שלכם לכישורים שלהן.",
  columns: [
    {
      title: "למעסיקים",
      links: [
        { href: "/employers", label: "עמוד מעסיקים" },
        { href: "/#how-it-works", label: "איך זה עובד?" },
        { href: "/#testimonials", label: "המלצות" },
        { href: "/employers#lead-form", label: "פתיחת דרישה" },
      ],
    },
    {
      title: "למועמדות",
      links: [
        { href: "/submit-cv", label: "שליחת קורות חיים" },
        { href: "/cv-builder", label: "בונה קורות חיים" },
        { href: "/jobs", label: "משרות פתוחות" },
        { href: "/blog", label: "טיפים לקורות חיים" },
        { href: "/profile", label: "הפרופיל שלי" },
      ],
    },
  ],
  legalLinks: [
    { href: "/privacy", label: "מדיניות פרטיות" },
    { href: "/accessibility", label: "הצהרת נגישות" },
    { href: "/terms", label: "תנאי שימוש" },
  ],
} as const;

/** Taken from the official brand asset (business card) — these are the real details. */
export const CONTACT_DETAILS = {
  email: "c0527674311@gmail.com",
  /** Planned dedicated intake address — not live yet, see README. */
  cvEmail: "",
  phone: "052-767-4311",
  phoneAlt: "073-338-3374",
  address: "קליקה, ז׳בוטינסקי 71, בני ברק",
  linkedin: "",
} as const;
