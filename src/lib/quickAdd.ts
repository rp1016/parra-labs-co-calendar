import { toDateKey } from "./dates";
import { makeEvent } from "./factory";
import { newId, type AppData, type CalendarEvent } from "./types";

export interface BusyRange {
  start: Date;
  end: Date;
}

const FIRST_HOUR = 9;
const LAST_START_HOUR = 18;
/** Gaps longer than this many hours are equally good, so the earliest wins. */
const GAP_CAP = 2;

const pad = (value: number) => String(value).padStart(2, "0");
const stamp = (day: Date, hour: number) => `${toDateKey(day)}T${pad(hour)}:00`;

/** Picks a free one-hour slot for a quick entry and spreads entries over the
 *  day: the first one goes to the earliest sensible hour (09:00, or the next
 *  whole hour when the day is today); later ones go to the free hour farthest
 *  from what is already scheduled, so tasks do not pile up back to back. */
export function pickQuickSlot(day: Date, busy: BusyRange[], now: Date = new Date()): { start: string; end: string } {
  const isToday = toDateKey(day) === toDateKey(now);
  const first = Math.min(isToday ? Math.max(FIRST_HOUR, now.getHours() + 1) : FIRST_HOUR, 23);
  const last = Math.max(LAST_START_HOUR, first);
  const hourMs = 3_600_000;
  const at = (hour: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();

  const isFree = (hour: number) =>
    !busy.some((range) => range.start.getTime() < at(hour) + hourMs && range.end.getTime() > at(hour));

  // Hours between the slot and the nearest scheduled item (0 when touching).
  const gap = (hour: number) => {
    let nearest = Infinity;
    for (const range of busy) {
      const before = (at(hour) - range.end.getTime()) / hourMs;
      const after = (range.start.getTime() - (at(hour) + hourMs)) / hourMs;
      nearest = Math.min(nearest, Math.max(before, after, 0));
    }
    return nearest;
  };

  let chosen = -1;
  let bestScore = -1;
  for (let hour = first; hour <= Math.min(last, 23); hour += 1) {
    if (!isFree(hour)) continue;
    const score = Math.min(gap(hour), GAP_CAP);
    if (score > bestScore) {
      bestScore = score;
      chosen = hour;
    }
  }
  if (chosen < 0) chosen = Math.min(first, 23);

  const endHour = chosen + 1;
  const end = endHour >= 24 ? `${toDateKey(day)}T23:59` : stamp(day, endHour);
  return { start: stamp(day, chosen), end };
}

/** First regular (non-holiday) calendar, which receives quick entries. */
export function quickCalendarId(data: AppData): string {
  const local = data.calendars.find((calendar) => calendar.kind !== "holiday");
  return local?.id ?? data.calendars[0]?.id ?? "personal";
}

export function buildQuickEvent(title: string, calendarId: string, slot: { start: string; end: string }): CalendarEvent {
  const nowIso = new Date().toISOString();
  return makeEvent({
    id: newId("evt"),
    calendarId,
    title: title.trim(),
    start: slot.start,
    end: slot.end,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}
