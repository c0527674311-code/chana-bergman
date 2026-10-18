/**
 * Technologies the matcher must recognise that the candidate form does not
 * offer in its dropdowns.
 *
 * Chana's archive is full of stacks the short list never covered: five CVs
 * mention COBOL and not one of them had it in a field, because the CV scan may
 * only choose values from the form's lists — so searching for COBOL returned
 * nothing. Everything here is recognised in a requirement and found in the CV
 * text itself, and the scan may store it too.
 *
 * A term still missing from this list is not lost: a requirement whose words
 * are all unknown is searched for in the CVs as it was written (see
 * `unknownTerms` in lib/matching.ts).
 *
 * Only terms specific enough to mean one thing belong here. "Access",
 * "Progress" and "Monday" are ordinary words and would match half the pool, so
 * they appear only in an unambiguous form ("MS Access").
 */
export type ExtraTerm = { term: string; kind: "lang" | "tech"; aliases?: string[] };

export const EXTRA_TERMS: ExtraTerm[] = [
  // ---- Languages ---------------------------------------------------------
  { term: "COBOL", kind: "lang", aliases: ["קובול"] },
  { term: "Fortran", kind: "lang", aliases: ["פורטרן"] },
  { term: "Pascal", kind: "lang", aliases: ["פסקל"] },
  { term: "Ada", kind: "lang" },
  { term: "RPG", kind: "lang", aliases: ["rpgle", "rpg iv"] },
  { term: "ABAP", kind: "lang", aliases: ["אבאפ"] },
  { term: "Delphi", kind: "lang", aliases: ["דלפי"] },
  { term: "Visual Basic", kind: "lang", aliases: ["vb6", "vb.net", "vbnet", "ויז'ואל בייסיק"] },
  { term: "VBA", kind: "lang" },
  { term: "VBScript", kind: "lang" },
  { term: "PowerShell", kind: "lang", aliases: ["פאוורשל"] },
  { term: "Bash", kind: "lang", aliases: ["shell scripting", "באש"] },
  { term: "Perl", kind: "lang", aliases: ["פרל"] },
  { term: "Ruby", kind: "lang", aliases: ["רובי"] },
  { term: "Scala", kind: "lang" },
  { term: "Groovy", kind: "lang" },
  { term: "Kotlin", kind: "lang", aliases: ["קוטלין"] },
  { term: "Swift", kind: "lang", aliases: ["סוויפט"] },
  { term: "Objective-C", kind: "lang", aliases: ["objective c", "objc"] },
  { term: "Dart", kind: "lang" },
  { term: "Lua", kind: "lang" },
  { term: "Haskell", kind: "lang" },
  { term: "Erlang", kind: "lang" },
  { term: "Elixir", kind: "lang" },
  { term: "Clojure", kind: "lang" },
  { term: "F#", kind: "lang" },
  { term: "MATLAB", kind: "lang", aliases: ["מטלב"] },
  { term: "Julia", kind: "lang" },
  { term: "Prolog", kind: "lang", aliases: ["פרולוג"] },
  { term: "Lisp", kind: "lang", aliases: ["common lisp"] },
  { term: "SAS", kind: "lang" },
  { term: "Classic ASP", kind: "lang", aliases: ["asp classic", "classic asp", "vbscript asp"] },
  { term: "Assembly", kind: "lang", aliases: ["assembler", "אסמבלי", "אסמבלר", "asm", "assembly language"] },
  { term: "Solidity", kind: "lang" },
  { term: "PL/SQL", kind: "lang", aliases: ["plsql"] },
  { term: "T-SQL", kind: "lang", aliases: ["tsql", "transact sql"] },
  { term: "VHDL", kind: "lang" },
  { term: "Verilog", kind: "lang", aliases: ["system verilog"] },

  // ---- Mainframe and enterprise -----------------------------------------
  { term: "AS/400", kind: "tech", aliases: ["as400", "ibm i", "iseries", "אס 400"] },
  { term: "Mainframe", kind: "tech", aliases: ["מיינפריים", "z/os"] },
  { term: "DB2", kind: "tech" },
  { term: "CICS", kind: "tech" },
  { term: "JCL", kind: "tech" },
  { term: "SAP", kind: "tech", aliases: ["סאפ", "sapui5", "sap ui5", "s/4hana", "sap hana", "sap b1", "sap business one", "abap"] },
  { term: "Priority", kind: "tech", aliases: ["פריוריטי", "פריורטי"] },
  { term: "Magic XPA", kind: "tech", aliases: ["magic unipaas", "מג'יק", "מג׳יק"] },
  { term: "PowerBuilder", kind: "tech" },
  { term: "Clarion", kind: "tech" },
  { term: "MS Access", kind: "tech", aliases: ["microsoft access", "אקסס"] },
  { term: "Salesforce", kind: "tech", aliases: ["סיילספורס", "apex"] },
  { term: "Dynamics 365", kind: "tech", aliases: ["ms dynamics", "dynamics crm"] },
  { term: "ServiceNow", kind: "tech" },
  { term: "NetSuite", kind: "tech" },
  { term: "Odoo", kind: "tech" },
  { term: "Oracle Forms", kind: "tech" },
  { term: "SharePoint", kind: "tech", aliases: ["שרפוינט"] },
  { term: "Office 365", kind: "tech", aliases: ["microsoft 365", "o365"] },

  // ---- Back-end frameworks ----------------------------------------------
  { term: "Spring", kind: "tech", aliases: ["spring boot", "ספרינג"] },
  { term: "Hibernate", kind: "tech" },
  { term: "Blazor", kind: "tech" },
  { term: "Entity Framework", kind: "tech", aliases: ["ef core"] },
  { term: "WPF", kind: "tech" },
  { term: "WinForms", kind: "tech", aliases: ["windows forms"] },
  { term: "WCF", kind: "tech" },
  { term: "Laravel", kind: "tech", aliases: ["לרוול"] },
  { term: "Symfony", kind: "tech" },
  { term: "Ruby on Rails", kind: "tech", aliases: ["rails"] },
  { term: "Flask", kind: "tech" },
  { term: "FastAPI", kind: "tech" },
  { term: "Express", kind: "tech", aliases: ["express js", "expressjs"] },
  { term: "NestJS", kind: "tech", aliases: ["nest js"] },
  { term: "GraphQL", kind: "tech" },
  { term: "REST API", kind: "tech", aliases: ["restful", "rest"] },
  { term: "gRPC", kind: "tech" },
  { term: "Microservices", kind: "tech", aliases: ["מיקרו סרוויסים"] },

  // ---- Front-end ---------------------------------------------------------
  { term: "Svelte", kind: "tech" },
  { term: "Ember", kind: "tech", aliases: ["ember js"] },
  { term: "Backbone", kind: "tech", aliases: ["backbone js"] },
  { term: "jQuery", kind: "tech", aliases: ["ג'יי קוורי"] },
  { term: "Bootstrap", kind: "tech", aliases: ["בוטסטרפ"] },
  { term: "Tailwind", kind: "tech", aliases: ["tailwind css"] },
  { term: "Sass", kind: "tech", aliases: ["scss"] },
  { term: "Redux", kind: "tech" },
  { term: "Webpack", kind: "tech" },
  { term: "Vite", kind: "tech" },
  { term: "Figma", kind: "tech", aliases: ["פיגמה"] },

  // ---- Mobile and desktop ------------------------------------------------
  { term: "Flutter", kind: "tech", aliases: ["פלאטר"] },
  { term: "Xamarin", kind: "tech" },
  { term: ".NET MAUI", kind: "tech", aliases: ["maui"] },
  { term: "Ionic", kind: "tech" },
  { term: "Electron", kind: "tech" },
  { term: "Qt", kind: "tech" },
  { term: "Unreal Engine", kind: "tech", aliases: ["unreal"] },

  // ---- Databases and data ------------------------------------------------
  { term: "Oracle", kind: "tech", aliases: ["אורקל"] },
  { term: "MySQL", kind: "tech" },
  { term: "MariaDB", kind: "tech" },
  { term: "SQLite", kind: "tech" },
  { term: "Redis", kind: "tech" },
  { term: "Elasticsearch", kind: "tech", aliases: ["elastic search", "elk"] },
  { term: "Cassandra", kind: "tech" },
  { term: "DynamoDB", kind: "tech" },
  { term: "Firebase", kind: "tech", aliases: ["פיירבייס"] },
  { term: "Supabase", kind: "tech" },
  { term: "Snowflake", kind: "tech" },
  { term: "BigQuery", kind: "tech" },
  { term: "Kafka", kind: "tech" },
  { term: "RabbitMQ", kind: "tech" },
  { term: "Airflow", kind: "tech" },
  { term: "Spark", kind: "tech", aliases: ["apache spark", "pyspark"] },
  { term: "Hadoop", kind: "tech" },
  { term: "Databricks", kind: "tech" },
  { term: "SSIS", kind: "tech" },
  { term: "SSRS", kind: "tech" },
  { term: "SSAS", kind: "tech" },
  { term: "Power BI", kind: "tech", aliases: ["powerbi", "פאוור בי איי"] },
  { term: "Tableau", kind: "tech" },
  { term: "QlikView", kind: "tech", aliases: ["qlik", "qlik sense"] },
  { term: "Pandas", kind: "tech" },
  { term: "NumPy", kind: "tech" },
  { term: "TensorFlow", kind: "tech" },
  { term: "PyTorch", kind: "tech" },
  { term: "scikit-learn", kind: "tech", aliases: ["sklearn", "scikit learn"] },
  { term: "NLP", kind: "tech", aliases: ["natural language processing"] },
  { term: "LLM", kind: "tech", aliases: ["gen ai", "generative ai", "בינה יוצרת"] },
  { term: "OpenAI", kind: "tech", aliases: ["chatgpt api"] },

  // ---- Cloud, DevOps, infrastructure -------------------------------------
  { term: "AWS", kind: "tech", aliases: ["amazon web services", "אמזון"] },
  { term: "Azure", kind: "tech", aliases: ["אז'ור", "אז׳ור"] },
  { term: "GCP", kind: "tech", aliases: ["google cloud"] },
  { term: "Terraform", kind: "tech" },
  { term: "Ansible", kind: "tech" },
  { term: "Jenkins", kind: "tech", aliases: ["ג'נקינס"] },
  { term: "GitLab CI", kind: "tech", aliases: ["gitlab"] },
  { term: "GitHub Actions", kind: "tech" },
  { term: "Azure DevOps", kind: "tech", aliases: ["tfs", "vsts"] },
  { term: "OpenShift", kind: "tech" },
  { term: "Nginx", kind: "tech" },
  { term: "IIS", kind: "tech" },
  { term: "Apache", kind: "tech", aliases: ["apache http"] },
  { term: "Linux", kind: "tech", aliases: ["לינוקס", "ubuntu", "red hat", "centos"] },
  { term: "Windows Server", kind: "tech" },
  { term: "VMware", kind: "tech", aliases: ["vsphere", "esxi"] },
  { term: "Citrix", kind: "tech" },
  { term: "Active Directory", kind: "tech", aliases: ["ldap"] },
  { term: "Exchange", kind: "tech", aliases: ["ms exchange"] },
  { term: "Git", kind: "tech", aliases: ["גיט"] },
  { term: "J2EE", kind: "tech", aliases: ["java ee", "jee", "jakarta ee"] },
  { term: "AJAX", kind: "tech" },
  { term: "JSON", kind: "tech" },
  { term: "XML", kind: "tech", aliases: ["xslt"] },
  { term: "ADABAS", kind: "tech", aliases: ["אדבס"] },

  // ---- QA and testing ----------------------------------------------------
  { term: "Selenium", kind: "tech", aliases: ["סלניום"] },
  { term: "Cypress", kind: "tech" },
  { term: "Playwright", kind: "tech" },
  { term: "Appium", kind: "tech" },
  { term: "Jest", kind: "tech" },
  { term: "JUnit", kind: "tech" },
  { term: "TestNG", kind: "tech" },
  { term: "NUnit", kind: "tech" },
  { term: "Postman", kind: "tech" },
  { term: "JMeter", kind: "tech" },
  { term: "SoapUI", kind: "tech" },
  { term: "Katalon", kind: "tech" },
  { term: "TestRail", kind: "tech" },
  { term: "Jira", kind: "tech", aliases: ["ג'ירה", "ג׳ירה"] },
  { term: "Manual QA", kind: "tech", aliases: ["qa ידני", "בדיקות ידניות", "manual testing"] },

  // ---- Security and networking -------------------------------------------
  { term: "Check Point", kind: "tech", aliases: ["checkpoint", "צ'ק פוינט"] },
  { term: "Palo Alto", kind: "tech" },
  { term: "Fortinet", kind: "tech", aliases: ["fortigate"] },
  { term: "Splunk", kind: "tech" },
  { term: "QRadar", kind: "tech" },
  { term: "SIEM", kind: "tech" },
  { term: "SOC", kind: "tech", aliases: ["מרכז בקרה"] },
  { term: "Penetration Testing", kind: "tech", aliases: ["pentest", "בדיקות חדירה"] },
  { term: "Cisco", kind: "tech", aliases: ["ccna", "סיסקו"] },

  // ---- Embedded and hardware ---------------------------------------------
  { term: "Embedded", kind: "tech", aliases: ["אמבדד", "מוטמע"] },
  { term: "RTOS", kind: "tech", aliases: ["freertos"] },
  { term: "FPGA", kind: "tech" },
  { term: "PLC", kind: "tech", aliases: ["scada"] },
  { term: "Arduino", kind: "tech" },
  { term: "Raspberry Pi", kind: "tech" },
  { term: "IoT", kind: "tech", aliases: ["אינטרנט של הדברים"] },

  // ---- Web platforms and CMS ---------------------------------------------
  { term: "Drupal", kind: "tech" },
  { term: "Joomla", kind: "tech" },
  { term: "Wix", kind: "tech", aliases: ["ויקס"] },
  { term: "Shopify", kind: "tech" },
  { term: "Magento", kind: "tech" },
  { term: "Umbraco", kind: "tech" },
  { term: "Sitecore", kind: "tech" },
  { term: "Elementor", kind: "tech" },
  { term: "HTML", kind: "tech", aliases: ["html5"] },
  { term: "CSS", kind: "tech", aliases: ["css3"] },
  { term: "SEO", kind: "tech" },
  { term: "Accessibility", kind: "tech", aliases: ["נגישות", "wcag"] },
];

export const EXTRA_TECHNOLOGIES = EXTRA_TERMS.filter((t) => t.kind === "tech").map((t) => t.term);
export const EXTRA_PROGRAMMING_LANGUAGES = EXTRA_TERMS.filter((t) => t.kind === "lang").map((t) => t.term);

/**
 * Things a requirement asks for as an idea rather than a product: "מפתחת צד שרת",
 * "ניהול גרסאות", "Agile". Left unrecognised, these fell through to a plain text
 * search, which lists everyone who wrote the word anywhere — a course list as
 * readily as a job — with no ranking and no "employment only".
 *
 * `phrases` are the ways a requirement or a CV names the idea itself. `tools`
 * are what a CV lists instead of naming it (a Node.js developer never writes
 * "backend"); they are matched in CV text only, so typing "Git" still asks for
 * Git and not for everyone who ever used version control.
 *
 * Kept apart from EXTRA_TERMS on purpose: the CV scan is only allowed to store
 * EXTRA_TERMS values on a candidate's card, and an idea is not a skill she has.
 */
export type Concept = { term: string; phrases: string[]; tools?: string[] };

export const CONCEPTS: Concept[] = [
  {
    term: "Backend",
    phrases: ["backend", "back end", "back-end", "בקאנד", "בק אנד", "צד שרת", "שרת צד", "server side", "server-side"],
    tools: ["node.js", "nodejs", "asp.net", "spring boot", "django", "flask", "fastapi", "express.js", "expressjs", "laravel", "web api", "webapi", "microservices"],
  },
  {
    term: "Frontend",
    phrases: ["frontend", "front end", "front-end", "פרונטאנד", "פרונט אנד", "פרונט", "צד לקוח", "לקוח צד", "client side", "client-side"],
    tools: ["react", "angular", "vue", "jquery", "bootstrap", "redux", "next.js", "svelte"],
  },
  { term: "Full Stack", phrases: ["fullstack", "full-stack", "full stack", "פולסטאק", "פול סטאק", "פולסטק"] },
  {
    term: "Agile",
    phrases: ["agile", "scrum", "סקראם", "kanban", "קנבן", "קאנבאן", "אג'ייל", "אג׳ייל", "אגייל", "ספרינטים", "sprints"],
  },
  {
    term: "Version Control",
    phrases: ["version control", "source control", "ניהול גרסאות", "ניהול גירסאות", "בקרת גרסאות", "בקרת גירסאות", "ניהול קוד מקור"],
    tools: ["git", "github", "gitlab", "bitbucket", "svn", "subversion", "tortoisegit", "גיט"],
  },
  {
    term: "Databases",
    phrases: ["database", "databases", "מסד נתונים", "מסדי נתונים", "בסיס נתונים", "בסיסי נתונים", "מאגרי מידע", "מאגר נתונים"],
    tools: ["sql", "mysql", "postgresql", "postgres", "sql server", "mssql", "oracle", "mongodb", "nosql", "sqlite", "db2", "redis", "mariadb"],
  },
  {
    term: "Data Structures",
    phrases: ["מבני נתונים", "data structures", "data structure", "אלגוריתמים", "אלגוריתם", "algorithms", "algorithm"],
  },
  {
    term: "OOP",
    phrases: ["oop", "object oriented", "object-oriented", "תכנות מונחה עצמים", "תכנות מונחה-עצמים", "מונחה עצמים"],
  },
  {
    term: "Operating Systems",
    phrases: ["מערכות הפעלה", "operating systems", "operating system"],
    tools: ["linux", "unix", "windows server", "ubuntu"],
  },
  {
    term: "Networking",
    phrases: ["networking", "תקשורת ורשתות", "רשתות תקשורת", "תקשורת נתונים", "רשתות מחשבים", "tcp/ip", "tcp ip", "ccna"],
    tools: ["cisco", "dns", "dhcp", "vpn"],
  },
  { term: "MVC", phrases: ["mvc"] },
  {
    term: "Cloud",
    phrases: ["cloud", "cloud computing", "מחשוב ענן", "ענן"],
    tools: ["aws", "azure", "gcp", "google cloud"],
  },
  { term: "Design Patterns", phrases: ["design patterns", "design pattern", "תבניות עיצוב", "דיזיין פטרנס"] },
  {
    term: "Software Testing",
    phrases: ["בדיקות תוכנה", "בדיקת תוכנה", "בודקת תוכנה", "בודקות תוכנה", "software testing", "בדיקות איכות", "בדיקות מערכת"],
    tools: ["test cases", "תסריטי בדיקה", "מקרי בדיקה", "manual testing", "בדיקות ידניות", "selenium", "cypress", "postman"],
  },
  {
    term: "Mobile",
    phrases: ["mobile", "מובייל", "אפליקציות מובייל", "mobile apps"],
    tools: ["android", "ios", "react native", "flutter", "kotlin", "swift", "xamarin"],
  },
];

export const CONCEPT_TERMS = CONCEPTS.map((c) => c.term);
