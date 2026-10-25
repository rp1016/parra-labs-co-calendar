import {
  MS_DAY,
  addDays,
  addMonths,
  parseDateKey,
  parseLocal,
  startOfDay,
  toDateKey,
} from "./dates";
import type { CalendarEvent, Occurrence, RepeatFreq } from "./types";

const MAX_OCCURRENCES = 400;

function make(event: CalendarEvent, start: Date, duration: number): Occurrence {
  return {
    event,
    start,
    end: new Date(start.getTime() + duration),
    key: `${event.id}@${start.getTime()}`,
  };
}

function step(cursor: Date, freq: RepeatFreq, interval: number): Date {
  switch (freq) {
    case "daily":
      return addDays(cursor, interval);
    case "weekly":
      return addDays(cursor, 7 * interval);
    case "monthly":
      return addMonths(cursor, interval);
    case "yearly":
      return addMonths(cursor, 12 * interval);
    default:
      return cursor;
  }
}

/** Jumps close to the requested window so a daily event created years ago does
 *  not need one iteration per day. */
function fastForward(base: Date, freq: RepeatFreq, interval: number, target: Date): Date {
  const elapsedDays = Math.max(0, Math.floor((target.getTime() - base.getTime()) / MS_DAY));
  let periods = 0;
  switch (freq) {
    case "daily":
      periods = Math.floor(elapsedDays / interval);
      break;
    case "weekly":
      periods = Math.floor(elapsedDays / 7 / interval);
      break;
    case "monthly":
      periods = Math.floor(elapsedDays / 30 / interval);
      break;
    case "yearly":
      periods = Math.floor(elapsedDays / 365 / interval);
      break;
    default:
      break;
  }
  let cursor = base;
  for (let i = 0; i < periods; i += 1) cursor = step(cursor, freq, interval);
  return cursor;
}

/** Every occurrence that overlaps [rangeStart, rangeEnd], recurring included. */
export function occurrencesBetween(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  const baseStart = parseLocal(event.start);
  const baseEnd = parseLocal(event.end);
  const duration = Math.max(0, baseEnd.getTime() - baseStart.getTime());
  const freq = event.repeat?.freq ?? "none";
  const interval = Math.max(1, event.repeat?.interval ?? 1);
  const until = event.repeat?.until ? parseDateKey(event.repeat.until) : null;
  const exdates = new Set(event.repeat?.exdates ?? []);

  if (freq === "none") {
    if (exdates.has(toDateKey(baseStart))) return [];
    return baseEnd >= rangeStart && baseStart <= rangeEnd ? [make(event, baseStart, duration)] : [];
  }

  const out: Occurrence[] = [];
  let cursor = baseStart < rangeStart ? fastForward(baseStart, freq, interval, rangeStart) : new Date(baseStart);
  let guard = 0;

  while (cursor <= rangeEnd && guard < MAX_OCCURRENCES) {
    if (until && startOfDay(cursor).getTime() > until.getTime()) break;
    const end = new Date(cursor.getTime() + duration);
    if (end >= rangeStart && !exdates.has(toDateKey(cursor))) out.push(make(event, cursor, duration));
    const next = step(cursor, freq, interval);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
    guard += 1;
  }
  return out;
}

export function occurrencesOnDay(event: CalendarEvent, day: Date): Occurrence[] {
  const start = startOfDay(day);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return occurrencesBetween(event, start, end);
}

export function sortOccurrences(items: Occurrence[]): Occurrence[] {
  return [...items].sort((a, b) => {
    if (a.start.getTime() !== b.start.getTime()) return a.start.getTime() - b.start.getTime();
    return a.event.title.localeCompare(b.event.title);
  });
}
