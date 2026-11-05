/**
 * Austrian date text helpers (DD.MM.YYYY) for typeable date pickers.
 * Pure + dependency-free so the same file can be mirrored across apps.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Date -> "DD.MM.YYYY" (local calendar parts). Empty string for no date. */
export function formatAustrianDate(d?: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Parse typed text into an ISO "YYYY-MM-DD" string, or null if it is not a real
 * calendar date. Accepts "1.2.1990", "01.02.1990", "01/02/1990", "01-02-1990"
 * and the bare digits "01021990". A 4-digit year is required.
 */
export function parseAustrianDate(text: string): string | null {
  const s = text.trim();
  let d: number, m: number, y: number;
  const sep = s.match(/^(\d{1,2})[.\-/\s](\d{1,2})[.\-/\s](\d{4})$/);
  if (sep) {
    d = +sep[1];
    m = +sep[2];
    y = +sep[3];
  } else if (/^\d{8}$/.test(s)) {
    d = +s.slice(0, 2);
    m = +s.slice(2, 4);
    y = +s.slice(4, 8);
  } else {
    return null;
  }
  if (y < 1000 || m < 1 || m > 12 || d < 1) return null;
  const dim = new Date(y, m, 0).getDate();
  if (d > dim) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Live-mask while typing: keeps digits and dots only, caps at 10 chars and
 * appends the dot automatically after a complete day / month when the user is
 * typing forward (not when deleting).
 */
export function maskAustrianDate(raw: string, prev: string): string {
  let v = raw.replace(/[^\d.]/g, "").slice(0, 10);
  const growing = v.length > prev.length;
  if (growing && (/^\d{2}$/.test(v) || /^\d{2}\.\d{2}$/.test(v))) v += ".";
  return v;
}
