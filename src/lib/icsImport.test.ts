import { describe, expect, it } from "vitest";
import { toLocalStamp } from "./dates";
import { parseICS } from "./icsImport";

const wrap = (body: string) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Test//EN",
    "X-WR-CALNAME:Cumpleaños",
    body,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

const NOW = new Date("2026-10-24T12:00:00Z");

describe("ics import", () => {
  it("reads the calendar name and a basic timed event", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:abc@example.com",
        "DTSTART:20261024T090000",
        "DTEND:20261024T103000",
        "SUMMARY:Reunión\\, equipo",
        "LOCATION:Sala 3",
        "DESCRIPTION:Línea 1\\nLínea 2",
        "CATEGORIES:Trabajo,Urgente",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const result = parseICS(text, "cal_1", NOW);

    expect(result.calendarName).toBe("Cumpleaños");
    expect(result.total).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.events).toHaveLength(1);
    const [event] = result.events;
    expect(event.calendarId).toBe("cal_1");
    expect(event.title).toBe("Reunión, equipo");
    expect(event.location).toBe("Sala 3");
    expect(event.notes).toBe("Línea 1\nLínea 2");
    expect(event.tags).toEqual(["Trabajo", "Urgente"]);
    expect(event.start).toBe("2026-10-24T09:00");
    expect(event.end).toBe("2026-10-24T10:30");
    expect(event.uid).toBe("abc@example.com");
    expect(event.allDay).toBe(false);
  });

  it("turns an exclusive DATE end into the last visible day", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:feriado",
        "DTSTART;VALUE=DATE:20261024",
        "DTEND;VALUE=DATE:20261026",
        "SUMMARY:Fin de semana largo",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const [event] = parseICS(text, "cal_1", NOW).events;
    expect(event.allDay).toBe(true);
    expect(event.start).toBe("2026-10-24T00:00");
    expect(event.end).toBe("2026-10-25T23:59");
  });

  it("unfolds continuation lines and honours DURATION", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:largo",
        "DTSTART:20261024T080000",
        "DURATION:PT1H30M",
        "SUMMARY:Reunión de",
        "  equipo",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const [event] = parseICS(text, "cal_1", NOW).events;
    expect(event.title).toBe("Reunión de equipo");
    expect(event.end).toBe("2026-10-24T09:30");
  });

  it("imports a simple RRULE and EXDATE list", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:serie",
        "DTSTART:20261005T090000",
        "DTEND:20261005T100000",
        "RRULE:FREQ=WEEKLY;COUNT=3",
        "EXDATE:20261012T090000",
        "SUMMARY:Clase",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const [event] = parseICS(text, "cal_1", NOW).events;
    expect(event.repeat.freq).toBe("weekly");
    expect(event.repeat.interval).toBe(1);
    expect(event.repeat.until).toBe("2026-10-19");
    expect(event.repeat.exdates).toEqual(["2026-10-12"]);
  });

  it("keeps the alarm offset without letting its description win", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:alarma",
        "DTSTART:20261024T090000",
        "DTEND:20261024T100000",
        "SUMMARY:Dentista",
        "DESCRIPTION:Nota real",
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Recordatorio",
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const [event] = parseICS(text, "cal_1", NOW).events;
    expect(event.reminderMinutes).toBe(15);
    expect(event.notes).toBe("Nota real");
  });

  it("maps TRANSP, STATUS, CLASS and attendees", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:estado",
        "DTSTART:20261024T090000",
        "DTEND:20261024T100000",
        "SUMMARY:Viaje",
        "TRANSP:TRANSPARENT",
        "CLASS:PRIVATE",
        "ATTENDEE;CN=Ana Pérez:mailto:ana@example.com",
        "ATTENDEE;CN=Luis:mailto:luis@example.com",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const [event] = parseICS(text, "cal_1", NOW).events;
    expect(event.showAs).toBe("free");
    expect(event.sensitivity).toBe("private");
    expect(event.attendees).toEqual(["Ana Pérez", "Luis"]);
  });

  it("reads a tentative status", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:tentativa",
        "DTSTART:20261024T090000",
        "DTEND:20261024T100000",
        "SUMMARY:Quizá",
        "STATUS:TENTATIVE",
        "END:VEVENT",
      ].join("\r\n"),
    );

    expect(parseICS(text, "cal_1", NOW).events[0].showAs).toBe("tentative");
  });

  it("normalizes UTC timestamps to the local wall clock", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:utc",
        "DTSTART:20261024T140000Z",
        "DTEND:20261024T150000Z",
        "SUMMARY:UTC",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const [event] = parseICS(text, "cal_1", NOW).events;
    expect(event.start).toBe(toLocalStamp(new Date(Date.UTC(2026, 9, 24, 14, 0, 0))));
    expect(event.allDay).toBe(false);
  });

  it("skips cancelled events and duplicate UIDs", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:cancelada",
        "DTSTART:20261024T090000",
        "SUMMARY:Cancelada",
        "STATUS:CANCELLED",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:repetida",
        "DTSTART:20261024T110000",
        "DTEND:20261024T120000",
        "SUMMARY:Primera copia",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:repetida",
        "DTSTART:20261024T110000",
        "DTEND:20261024T120000",
        "SUMMARY:Segunda copia",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const result = parseICS(text, "cal_1", NOW);
    expect(result.total).toBe(3);
    expect(result.skipped).toBe(2);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Primera copia");
  });

  it("reports what it had to approximate", () => {
    const text = wrap(
      [
        "BEGIN:VEVENT",
        "UID:zonas",
        "DTSTART;TZID=Europe/Madrid:20261024T090000",
        "DTEND;TZID=Europe/Madrid:20261024T100000",
        "SUMMARY:Con zona",
        "RRULE:FREQ=MONTHLY;BYDAY=MO",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:excepcion",
        "RECURRENCE-ID:20261025T090000",
        "DTSTART:20261025T110000",
        "DTEND:20261025T120000",
        "SUMMARY:Movida",
        "END:VEVENT",
      ].join("\r\n"),
    );

    const result = parseICS(text, "cal_1", NOW);
    expect(result.events).toHaveLength(2);
    const text2 = result.limitations.join(" ");
    expect(text2).toContain("TZID");
    expect(text2).toContain("BYDAY");
    expect(text2).toContain("RECURRENCE-ID");
    expect(result.events[0].start).toBe("2026-10-24T09:00");
  });

  it("reports a file with no usable events", () => {
    const result = parseICS(wrap(""), "cal_1", NOW);
    expect(result.events).toHaveLength(0);
    expect(result.limitations.join(" ")).toContain("no contiene eventos");
  });
});
