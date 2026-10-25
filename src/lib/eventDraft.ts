import { combine, toLocalStamp } from "./dates";
import { newId, type CalendarEvent } from "./types";

export function emptyEvent(dateKey: string, time: string, calendarId: string): CalendarEvent {
  const start = combine(dateKey, time);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = new Date().toISOString();
  return {
    id: newId("evt"),
    calendarId,
    title: "",
    notes: "",
    location: "",
    allDay: false,
    start: toLocalStamp(start),
    end: toLocalStamp(end),
    tags: [],
    reminderMinutes: null,
    repeat: { freq: "none", interval: 1, until: null },
    showAs: "busy",
    sensitivity: "normal",
    attendees: [],
    doneDates: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function eventTimeLabel(start: Date, end: Date, allDay: boolean, locale: string): string {
  if (allDay) return "Todo el día";
  const format = (date: Date) =>
    date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${format(start)} – ${format(end)}`;
}
