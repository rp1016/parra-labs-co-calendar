import { describe, expect, it } from "vitest";
import { layoutDay } from "./layout";
import { parseLocal } from "./dates";

function item(start: string, end: string) {
  return { start: parseLocal(start), end: parseLocal(end) };
}

describe("layoutDay", () => {
  it("keeps separate events full width", () => {
    const slots = layoutDay([
      item("2026-10-24T09:00", "2026-10-24T10:00"),
      item("2026-10-24T11:00", "2026-10-24T12:00"),
    ]);
    expect(slots.map((slot) => slot.columns)).toEqual([1, 1]);
  });

  it("splits overlapping events into columns", () => {
    const slots = layoutDay([
      item("2026-10-24T09:00", "2026-10-24T11:00"),
      item("2026-10-24T09:30", "2026-10-24T10:30"),
      item("2026-10-24T10:00", "2026-10-24T11:30"),
    ]);
    expect(slots.map((slot) => slot.column)).toEqual([0, 1, 2]);
    expect(slots.map((slot) => slot.columns)).toEqual([3, 3, 3]);
  });

  it("reuses a free column after a gap", () => {
    const slots = layoutDay([
      item("2026-10-24T09:00", "2026-10-24T12:00"),
      item("2026-10-24T09:00", "2026-10-24T10:00"),
      item("2026-10-24T10:30", "2026-10-24T11:00"),
    ]);
    expect(slots.map((slot) => slot.column)).toEqual([0, 1, 1]);
    expect(slots.every((slot) => slot.columns === 2)).toBe(true);
  });
});
