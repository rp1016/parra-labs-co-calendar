import { describe, expect, it } from "vitest";
import { makeEvent } from "./factory";
import { occurrencesBetween } from "./recurrence";
import { endOfDay, parseDateKey, startOfDay } from "./dates";

const window = (from: string, to: string) =>
  [startOfDay(parseDateKey(from)), endOfDay(parseDateKey(to))] as const;

describe("recurrence", () => {
  it("returns a one-off event only inside its window", () => {
    const event = makeEvent();
    expect(occurrencesBetween(event, ...window("2026-10-01", "2026-10-31"))).toHaveLength(1);
    expect(occurrencesBetween(event, ...window("2026-11-01", "2026-11-30"))).toHaveLength(0);
  });

  it("steps weekly occurrences", () => {
    const event = makeEvent({
      start: "2026-10-05T09:00",
      end: "2026-10-05T10:00",
      repeat: { freq: "weekly", interval: 1, until: null },
    });
    const found = occurrencesBetween(event, ...window("2026-10-01", "2026-10-31"));
    expect(found.map((item) => item.start.getDate())).toEqual([5, 12, 19, 26]);
  });

  it("honours UNTIL inclusively", () => {
    const event = makeEvent({
      start: "2026-10-05T09:00",
      end: "2026-10-05T10:00",
      repeat: { freq: "weekly", interval: 2, until: "2026-10-19" },
    });
    const found = occurrencesBetween(event, ...window("2026-10-01", "2026-12-31"));
    expect(found.map((item) => item.start.getDate())).toEqual([5, 19]);
  });

  it("fast-forwards daily events created years ago", () => {
    const event = makeEvent({
      start: "2020-01-01T08:00",
      end: "2020-01-01T08:30",
      repeat: { freq: "daily", interval: 1, until: null },
    });
    const found = occurrencesBetween(event, ...window("2026-10-24", "2026-10-26"));
    expect(found).toHaveLength(3);
    expect(found[0].start.getHours()).toBe(8);
  });

  it("keeps the duration across midnight", () => {
    const event = makeEvent({
      start: "2026-10-24T23:00",
      end: "2026-10-25T01:00",
      repeat: { freq: "weekly", interval: 1, until: null },
    });
    const found = occurrencesBetween(event, ...window("2026-10-25", "2026-10-25"));
    expect(found).toHaveLength(1);
    expect(found[0].end.getTime() - found[0].start.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it("skips EXDATE occurrences without shifting the series", () => {
    const event = makeEvent({
      start: "2026-10-05T09:00",
      end: "2026-10-05T10:00",
      repeat: {
        freq: "weekly",
        interval: 1,
        until: null,
        exdates: ["2026-10-12", "2026-10-26"],
      },
    });
    const found = occurrencesBetween(event, ...window("2026-10-01", "2026-10-31"));
    expect(found.map((item) => item.start.getDate())).toEqual([5, 19]);
  });

  it("drops a one-off event listed as an exception", () => {
    const event = makeEvent({
      repeat: { freq: "none", interval: 1, until: null, exdates: ["2026-10-24"] },
    });
    expect(occurrencesBetween(event, ...window("2026-10-01", "2026-10-31"))).toHaveLength(0);
  });
});
