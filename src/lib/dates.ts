/** Local-time calendar helpers. No timezone conversion ever happens: the app
 *  stores wall-clock strings so a backup restored in another timezone keeps the
 *  same "9:00" the user wrote. */

export const MS_DAY = 86_400_000;

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toLocalStamp(date: Date): string {
  return `${toDateKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function parseLocal(stamp: string): Date {
  const [datePart, timePart = "00:00"] = stamp.split("T");
  const [h, min] = timePart.split(":").map(Number);
  const date = parseDateKey(datePart);
  date.setHours(h ?? 0, min ?? 0, 0, 0);
  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1, date.getHours(), date.getMinutes());
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const day = startOfDay(date);
  const diff = (day.getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -diff);
}

export function endOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  return endOfWeekFromStart(startOfWeek(date, weekStartsOn));
}

function endOfWeekFromStart(start: Date): Date {
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
}

/** Six weeks of days covering the requested month. */
export function monthGrid(year: number, monthIndex: number, weekStartsOn: 0 | 1): Date[] {
  const first = new Date(year, monthIndex, 1);
  const start = startOfWeek(first, weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Builds a local Date from a date key plus an "HH:mm" time. */
export function combine(dateKey: string, time: string): Date {
  const date = parseDateKey(dateKey);
  const [h, m] = time.split(":").map(Number);
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date;
}

export function timeInputValue(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function isoWeek(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * MS_DAY));
}

/** Whole days between two local midnights (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_DAY);
}

export function formatMonthYear(date: Date, locale: string): string {
  return upperFirst(new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date));
}

export function formatLongDate(date: Date, locale: string): string {
  return upperFirst(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date),
  );
}

function upperFirst(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
}

export function formatDayMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
}

export function formatWeekday(date: Date, locale: string, style: "short" | "narrow" = "short"): string {
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(date);
}

export function formatTime(date: Date, locale: string, use24h: boolean): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24h,
  }).format(date);
}

/** Wall clock of the same instant in another IANA zone. */
export function formatTimeInZone(date: Date, timeZone: string, locale: string, use24h: boolean): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24h,
  }).format(date);
}

/** Short zone name ("COT", "CEST"…) for the visible day. */
export function formatZoneName(date: Date, timeZone: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

export function formatDuration(start: Date, end: Date, locale: string): string {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hLabel = new Intl.NumberFormat(locale).format(hours);
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hLabel} h`;
  return `${hLabel} h ${rest} min`;
}

export function weekdayOrder(weekStartsOn: 0 | 1): number[] {
  return Array.from({ length: 7 }, (_, index) => (index + weekStartsOn) % 7);
}

export function monthsOfYear(locale: string): string[] {
  return Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, month, 1)),
  );
}
