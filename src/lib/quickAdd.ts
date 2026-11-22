import { toDateKey } from "./dates";
import { makeEvent } from "./factory";
import { newId, type AppData, type CalendarEvent } from "./types";

export interface BusyRange {
  start: Date;
  end: Date;
}

const FIRST_HOUR = 9;
const LAST_START_HOUR = 20;

const pad = (value: number) => String(value).padStart(2, "0");
const stamp = (day: Date, hour: number) => `${toDateKey(day)}T${pad(hour)}:00`;

/** Picks a free one-hour slot for a quick entry: the next whole hour when the
 *  day is today, 09:00 otherwise, skipping hours that already have something. */
export function pickQuickSlot(day: Date, busy: BusyRange[], now: Date = new Date()): { start: string; end: string } {
  const isToday = toDateKey(day) === toDateKey(now);
  const first = isToday ? Math.max(FIRST_HOUR, now.getHours() + 1) : FIRST_HOUR;
  const startHour = Math.min(first, 23);

  const isFree = (hour: number) => {
    const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
    const to = from + 3_600_000;
    return !busy.some((range) => range.start.getTime() < to && range.end.getTime() > from);
  };

  let chosen = startHour;
  for (let hour = startHour; hour <= Math.max(LAST_START_HOUR, startHour); hour += 1) {
    if (hour > 23) break;
    if (isFree(hour)) {
      chosen = hour;
      break;
    }
  }
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
