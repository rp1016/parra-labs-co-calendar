import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysBetween,
  endOfWeek,
  formatTime,
  isoWeek,
  monthGrid,
  parseDateKey,
  parseLocal,
  startOfWeek,
  toDateKey,
  toLocalStamp,
} from "./dates";

describe("dates", () => {
  it("keeps wall-clock strings untouched", () => {
    const date = parseLocal("2026-10-24T09:05");
    expect(toDateKey(date)).toBe("2026-10-24");
    expect(toLocalStamp(date)).toBe("2026-10-24T09:05");
    expect(date.getHours()).toBe(9);
  });

  it("clamps monthly steps to the last day", () => {
    const january = parseDateKey("2026-01-31");
    expect(toDateKey(addMonths(january, 1))).toBe("2026-02-28");
    expect(toDateKey(addMonths(parseDateKey("2026-02-28"), 1))).toBe("2026-03-28");
  });

  it("starts weeks on the configured day", () => {
    const saturday = parseDateKey("2026-10-24");
    expect(toDateKey(startOfWeek(saturday, 1))).toBe("2026-10-19");
    expect(toDateKey(endOfWeek(saturday, 1))).toBe("2026-10-25");
    expect(toDateKey(startOfWeek(saturday, 0))).toBe("2026-10-18");
  });

  it("builds a six-week month grid", () => {
    const grid = monthGrid(2026, 9, 1);
    expect(grid).toHaveLength(42);
    expect(toDateKey(grid[0])).toBe("2026-09-28");
    expect(toDateKey(grid[41])).toBe("2026-11-08");
  });

  it("counts whole days and formats times", () => {
    expect(daysBetween(parseDateKey("2026-10-24"), parseDateKey("2026-10-26"))).toBe(2);
    expect(formatTime(parseLocal("2026-10-24T18:07"), "es-ES", true)).toMatch(/18:07/);
  });

  it("numbers weeks with the ISO 8601 rule", () => {
    expect(isoWeek(parseDateKey("2026-10-24"))).toBe(43);
    expect(isoWeek(parseDateKey("2027-01-01"))).toBe(53);
    expect(isoWeek(parseDateKey("2026-01-01"))).toBe(1);
  });
});
