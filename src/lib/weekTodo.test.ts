import { describe, expect, it } from "vitest";
import { parseDateKey, parseLocal } from "./dates";
import { emptyEvent } from "./eventDraft";
import { normalizeData } from "./normalize";
import { formatWeekRange, groupWeekTodos, isTodoDone, todoStats } from "./weekTodo";
import type { CalendarEvent, Occurrence } from "./types";

function occurrence(event: CalendarEvent, dateKey: string, time = "09:00"): Occurrence {
  const start = parseLocal(`${dateKey}T${time}`);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { event, start, end, key: `${event.id}-${start.getTime()}` };
}

describe("week TODO grouping", () => {
  const weekStart = parseDateKey("2026-10-19");

  it("puts each task on the day it starts", () => {
    const monday = emptyEvent("2026-10-19", "09:00", "personal");
    const wednesday = emptyEvent("2026-10-21", "18:00", "personal");
    const nextWeek = emptyEvent("2026-10-26", "09:00", "personal");

    const days = groupWeekTodos(weekStart, [
      occurrence(wednesday, "2026-10-21", "18:00"),
      occurrence(monday, "2026-10-19"),
      occurrence(nextWeek, "2026-10-26"),
    ]);

    expect(days).toHaveLength(7);
    expect(days[0].items).toHaveLength(1);
    expect(days[2].items).toHaveLength(1);
    expect(days.reduce((total, day) => total + day.items.length, 0)).toBe(2);
  });

  it("counts completion per occurrence", () => {
    const repeat = emptyEvent("2026-10-19", "07:00", "personal");
    repeat.repeat = { freq: "daily", interval: 1, until: null };
    repeat.doneDates = ["2026-10-19"];

    const monday = occurrence(repeat, "2026-10-19", "07:00");
    const tuesday = occurrence(repeat, "2026-10-20", "07:00");
    const days = groupWeekTodos(weekStart, [monday, tuesday]);

    expect(isTodoDone(monday)).toBe(true);
    expect(isTodoDone(tuesday)).toBe(false);
    expect(todoStats(days)).toEqual({ done: 1, total: 2, pending: 1 });
  });

  it("serializes a compact week range", () => {
    expect(formatWeekRange(weekStart, parseDateKey("2026-10-25"), "es-ES")).toBe(
      "19 – 25 oct",
    );
    expect(formatWeekRange(parseDateKey("2026-09-28"), parseDateKey("2026-10-04"), "es-ES")).toBe(
      "28 sept – 4 oct",
    );
  });

  it("repairs stored completion dates", () => {
    const event = emptyEvent("2026-10-19", "09:00", "personal");
    const data = normalizeData({
      events: [
        {
          ...event,
          doneDates: ["2026-10-19", "2026-10-19", "not-a-date", "2026-13-99"] as string[],
        },
      ],
    });
    expect(data.events[0].doneDates).toEqual(["2026-10-19"]);
  });
});
