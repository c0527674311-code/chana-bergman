/**
 * Technologies the matcher must recognise that the candidate form does not
 * offer in its dropdowns.
 *
 * Chana's archive is full of enterprise and legacy stacks: five CVs mention
 * COBOL and not one of them had it in a field, because the CV scan may only
 * choose values from the form's lists. Searching for COBOL therefore returned
 * nothing. These terms are read from the requirement text and found in the CV
 * text itself.
 */
export type ExtraTerm = { term: string; kind: "lang" | "tech"; aliases?: string[] };

export const EXTRA_TERMS: ExtraTerm[] = [
  { term: "COBOL", kind: "lang", aliases: ["קובול"] },
  { term: "RPG", kind: "lang", aliases: ["rpgle", "rpg iv"] },
  { term: "ABAP", kind: "lang", aliases: ["אבאפ"] },
  { term: "Delphi", kind: "lang", aliases: ["דלפי"] },
  { term: "Visual Basic", kind: "lang", aliases: ["vb6", "vb.net", "vbnet", "ויז'ואל בייסיק"] },
  { term: "VBA", kind: "lang" },
  { term: "Fortran", kind: "lang", aliases: ["פורטרן"] },
  { term: "Pascal", kind: "lang", aliases: ["פסקל"] },
  { term: "PL/SQL", kind: "lang", aliases: ["plsql"] },
  { term: "AS/400", kind: "tech", aliases: ["as400", "ibm i", "iseries", "אס 400"] },
  { term: "Mainframe", kind: "tech", aliases: ["מיינפריים", "z/os"] },
  { term: "DB2", kind: "tech" },
  { term: "CICS", kind: "tech" },
  { term: "JCL", kind: "tech" },
  { term: "SAP", kind: "tech", aliases: ["סאפ"] },
  { term: "Priority", kind: "tech", aliases: ["פריוריטי", "פריורטי"] },
  { term: "Magic XPA", kind: "tech", aliases: ["magic unipaas", "מג'יק", "מג׳יק"] },
  { term: "PowerBuilder", kind: "tech" },
  { term: "Clarion", kind: "tech" },
  { term: "MS Access", kind: "tech", aliases: ["microsoft access", "אקסס"] },
  { term: "Salesforce", kind: "tech", aliases: ["סיילספורס"] },
  { term: "Dynamics 365", kind: "tech", aliases: ["ms dynamics", "dynamics crm"] },
  { term: "ServiceNow", kind: "tech" },
  { term: "Oracle Forms", kind: "tech" },
  { term: "SharePoint", kind: "tech", aliases: ["שרפוינט"] },
];

export const EXTRA_TECHNOLOGIES = EXTRA_TERMS.filter((t) => t.kind === "tech").map((t) => t.term);
export const EXTRA_PROGRAMMING_LANGUAGES = EXTRA_TERMS.filter((t) => t.kind === "lang").map((t) => t.term);
