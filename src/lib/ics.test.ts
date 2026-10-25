import { describe, expect, it } from "vitest";
import { makeEvent } from "./factory";
import { buildICS } from "./ics";

const NOW = new Date("2026-10-24T12:00:00Z");

describe("ics export", () => {
  it("writes a well-formed calendar ending in CRLF", () => {
    const text = buildICS([makeEvent()], "Personal", NOW);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("DTSTART:20261024T090000");
    expect(text).toContain("DTEND:20261024T100000");
    expect(text).toContain("SUMMARY:Cita");
    expect(text).toContain("UID:evt_1@parritalabs.com");
  });

  it("exports all-day events with an exclusive DTEND", () => {
    const text = buildICS(
      [
        makeEvent({
          allDay: true,
          start: "2026-10-24T00:00",
          end: "2026-10-24T23:59",
          title: "Feriado",
        }),
      ],
      "Personal",
      NOW,
    );
    expect(text).toContain("DTSTART;VALUE=DATE:20261024");
    expect(text).toContain("DTEND;VALUE=DATE:20261025");
  });

  it("maps repetition to RRULE with a floating UNTIL", () => {
    const text = buildICS(
      [
        makeEvent({
          repeat: { freq: "weekly", interval: 2, until: "2026-12-31" },
        }),
      ],
      "Personal",
      NOW,
    );
    expect(text).toContain("RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T235900");
  });

  it("escapes text and folds long lines", () => {
    const text = buildICS(
      [
        makeEvent({
          title: `Reunión, con; caracteres\\raros ${"x".repeat(120)}`,
          notes: "Línea 1\nLínea 2",
        }),
      ],
      "Personal",
      NOW,
    );
    expect(text).toContain("\\n");
    const physical = text.split("\r\n");
    const encoder = new TextEncoder();
    expect(physical.every((line) => encoder.encode(line).length <= 75)).toBe(true);
    expect(physical.some((line) => line.startsWith(" "))).toBe(true);
  });

  it("omits RRULE when the event does not repeat", () => {
    expect(buildICS([makeEvent()], "Personal", NOW)).not.toContain("RRULE:");
  });
});
