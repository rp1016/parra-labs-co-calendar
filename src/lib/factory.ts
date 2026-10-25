import type { CalendarEvent } from "./types";

export function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt_1",
    calendarId: "personal",
    title: "Cita",
    notes: "",
    location: "",
    allDay: false,
    start: "2026-10-24T09:00",
    end: "2026-10-24T10:00",
    tags: [],
    reminderMinutes: null,
    repeat: { freq: "none", interval: 1, until: null },
    showAs: "busy",
    sensitivity: "normal",
    attendees: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}
