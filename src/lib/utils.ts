import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalises an email for duplicate detection: trim + lowercase. */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e.length > 0 ? e : null;
}

/**
 * Normalises an Israeli phone number to a bare national form so that
 * "054-123-4567", "+972 54 1234567" and "0541234567" all collapse to one key.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  if (d.length === 9 && !d.startsWith("0")) d = "0" + d;
  return d.length >= 9 ? d : null;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function initials(first?: string | null, last?: string | null): string {
  return [first?.[0], last?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

/**
 * Builds an object key that Supabase Storage will accept.
 *
 * The previous sanitiser deliberately kept Hebrew letters, and Storage rejects
 * them outright — `InvalidKey`. Every CV named in Hebrew, which is most of
 * Chana's archive, failed to upload and the whole submission was lost with it.
 *
 * Only the *key* is transliterated away; the real filename is stored on
 * `cv_documents.file_name`, so nothing a candidate or Chana would recognise is
 * lost. A fully-Hebrew name collapses to "cv", which is fine — the key is
 * already prefixed with the candidate id and a timestamp.
 */
export function storageKey(fileName: string): string {
  const extMatch = fileName.match(/\.([A-Za-z0-9]{1,8})$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
  const base = fileName
    .slice(0, fileName.length - ext.length)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    // A Hebrew name with underscores collapses to something like "_-_-_", which
    // is noise, not a name. Treat a base with no letters or digits as empty.
    .replace(/[-._]{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 60);
  const meaningful = /[A-Za-z0-9]/.test(base) ? base : "";
  return `${meaningful || "cv"}${ext}`;
}
