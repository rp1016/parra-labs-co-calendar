import { describe, expect, it } from "vitest";
import {
  buildBackup,
  eventsToMarkdown,
  exportFileName,
  notesToMarkdown,
  parseBackup,
} from "./exporters";
import { makeEvent } from "./factory";
import { defaultData } from "./types";

function library() {
  const data = defaultData();
  data.calendars.push({ id: "trabajo", name: "Trabajo", color: "#0b7f86", visible: true });
  data.events = [
    makeEvent({ id: "evt_1", title: "Dentista" }),
    makeEvent({
      id: "evt_2",
      calendarId: "trabajo",
      title: "Entrega",
      allDay: true,
      start: "2026-10-25T00:00",
      end: "2026-10-25T23:59",
      location: "Oficina",
    }),
  ];
  data.notes = [
    {
      id: "note_1",
      title: "Ideas",
      body: "# Título\n\n- uno\n- dos",
      tags: ["personal"],
      date: "2026-10-24",
      pinned: true,
      createdAt: "2026-10-24T08:00:00.000Z",
      updatedAt: "2026-10-24T09:00:00.000Z",
    },
  ];
  return data;
}

describe("backup export", () => {
  it("round-trips every collection through the envelope", () => {
    const data = library();
    const restored = parseBackup(buildBackup(data, new Date("2026-10-24T12:00:00Z")));

    expect(restored.events.map((event) => event.id)).toEqual(["evt_1", "evt_2"]);
    expect(restored.notes[0].tags).toEqual(["personal"]);
    expect(restored.calendars.map((calendar) => calendar.name)).toEqual(["Personal", "Trabajo"]);
    expect(restored.settings.language).toBe("es");
  });

  it("accepts a bare document and repairs missing fields", () => {
    const restored = parseBackup(
      JSON.stringify({
        events: [{ id: "evt_x", title: "Pelado" }],
        notes: [],
        calendars: [],
      }),
    );
    expect(restored.calendars).toHaveLength(1);
    expect(restored.events[0].tags).toEqual([]);
    expect(restored.events[0].repeat.freq).toBe("none");
    expect(restored.settings.theme).toBe("auto");
  });

  it("refuses files that are not a backup", () => {
    expect(() => parseBackup("{ not json")).toThrow();
    expect(() => parseBackup('{"events":[]}')).toThrow();
  });
});

describe("markdown exports", () => {
  it("groups events by day and marks all-day rows", () => {
    const text = eventsToMarkdown(library().events, "es-ES", new Date("2026-10-24T12:00:00Z"));
    expect(text).toContain("# Agenda");
    expect(text).toContain("**Todo el día** — Entrega · Oficina");
    expect(text).toContain("**09:00–10:00** — Dentista");
  });

  it("groups notes by their linked day", () => {
    const text = notesToMarkdown(library().notes, "es-ES", new Date("2026-10-24T12:00:00Z"));
    expect(text).toContain("### Ideas");
    expect(text).toContain("`#personal`");
    expect(text).toContain("- uno");
  });

  it("names files with the current date", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    expect(exportFileName("backup", now)).toBe("parrita-calendar-backup-2026-10-24.json");
    expect(exportFileName("ics", now)).toBe("parrita-calendar-2026-10-24.ics");
    expect(exportFileName("notes", now)).toBe("parrita-notes-2026-10-24.md");
  });
});
