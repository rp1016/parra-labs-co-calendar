import { describe, expect, it } from "vitest";
import { normalizeData } from "./normalize";

// Shape written by CalendarPRO 0.2.4: an update must keep all of it.
const v024 = {
  version: 1,
  calendars: [{ id: "personal", name: "Personal", color: "#15bed1", visible: true, kind: "local" }],
  events: [
    {
      id: "evt_1", calendarId: "personal", title: "Dentista", notes: "n", location: "x", allDay: false,
      start: "2026-11-24T09:00", end: "2026-11-24T10:00", tags: ["salud"], reminderMinutes: 15,
      repeat: { freq: "none", interval: 1, until: null }, showAs: "busy", sensitivity: "normal",
      attendees: [], doneDates: ["2026-11-24"], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  notes: [{ id: "n1", title: "Nota", body: "hola", tags: [], date: null, pinned: true, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" }],
  settings: { theme: "dark", accent: "teal", language: "en", weekStartsOn: 1, use24h: true, defaultView: "week", notifications: true, compact: false, showWeekNumbers: true, secondTimeZone: null, autoBackup: true, artTheme: "birds" },
};

describe("upgrade from 0.2.4 data", () => {
  it("keeps events, notes and settings", () => {
    const data = normalizeData(JSON.parse(JSON.stringify(v024)));
    expect(data.events).toHaveLength(1);
    expect(data.events[0].title).toBe("Dentista");
    expect(data.events[0].doneDates).toEqual(["2026-11-24"]);
    expect(data.notes[0].pinned).toBe(true);
    expect(data.settings).toMatchObject({ theme: "dark", accent: "teal", language: "en", weekStartsOn: 1, artTheme: "birds", defaultView: "week" });
  });
});
