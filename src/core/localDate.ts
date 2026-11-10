/** Calendar date without time zone (java.time.LocalDate semantics). */
export interface LocalDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

export const MIN_DATE: LocalDate = { year: 1900, month: 1, day: 1 };
export const MAX_DATE: LocalDate = { year: 2100, month: 12, day: 31 };

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

/** LocalDate.plusMonths: clamps the day to the last valid day of the target month. */
export function plusMonths(d: LocalDate, n: number): LocalDate {
  const total = d.year * 12 + (d.month - 1) + n;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}

export function compareDate(a: LocalDate, b: LocalDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function isValidDate(d: LocalDate): boolean {
  return (
    Number.isInteger(d.year) &&
    Number.isInteger(d.month) &&
    Number.isInteger(d.day) &&
    d.month >= 1 &&
    d.month <= 12 &&
    d.day >= 1 &&
    d.day <= daysInMonth(d.year, d.month)
  );
}

export function inSupportedRange(d: LocalDate): boolean {
  return compareDate(d, MIN_DATE) >= 0 && compareDate(d, MAX_DATE) <= 0;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** ISO form uuuu-MM-dd used in the form, results and history. */
export function formatIso(d: LocalDate): string {
  return `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)}`;
}

/** Strict uuuu-MM-dd parser (ResolverStyle.STRICT). */
export function parseIso(text: string): LocalDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const d = { year: +m[1], month: +m[2], day: +m[3] };
  return isValidDate(d) ? d : null;
}

/** MM/dd/yyyy text-entry form used by the date dialog's keyboard mode. */
export function formatMdy(d: LocalDate): string {
  return `${pad(d.month)}/${pad(d.day)}/${pad(d.year, 4)}`;
}

export function parseMdy(text: string): LocalDate | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const d = { year: +m[3], month: +m[1], day: +m[2] };
  return isValidDate(d) ? d : null;
}

/** Device-local today; never via UTC conversion (that would shift the date). */
export function today(now: Date = new Date()): LocalDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** 0 = Sunday. */
export function dayOfWeek(d: LocalDate): number {
  return new Date(d.year, d.month - 1, d.day).getDay();
}
