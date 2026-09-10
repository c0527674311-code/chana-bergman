/**
 * A free-text search that is really a phone number, reduced to bare digits.
 *
 * `search_text` holds the phone as digits only, so "052-767-4311",
 * "(052) 767 4311" and "+972 52 767 4311" all have to become "0527674311" —
 * otherwise a search found only candidates whose phone happened to be typed
 * the same way. Returns null for anything that is not phone-shaped (letters,
 * or fewer than 7 digits), which is then searched as ordinary text.
 */
export function phoneSearchDigits(q: string): string | null {
  const t = q.trim();
  if (!/^\+?[\d\s()-]+$/.test(t)) return null;
  let digits = t.replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}
