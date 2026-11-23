import { describe, expect, it } from "vitest";
import { pickQuickSlot } from "./quickAdd";

const day = new Date(2026, 10, 24);
const now = new Date(2026, 10, 22, 14, 20);

describe("pickQuickSlot", () => {
  it("uses 09:00 on another day", () => {
    expect(pickQuickSlot(day, [], now)).toEqual({ start: "2026-11-24T09:00", end: "2026-11-24T10:00" });
  });
  it("uses the next whole hour today", () => {
    const today = new Date(2026, 10, 22);
    expect(pickQuickSlot(today, [], now).start).toBe("2026-11-22T15:00");
  });
  it("never overlaps and spreads later tasks away from existing ones", () => {
    const busy = [{ start: new Date(2026, 10, 24, 9), end: new Date(2026, 10, 24, 10) }];
    expect(pickQuickSlot(day, busy, now).start).toBe("2026-11-24T12:00");
    const more = [...busy, { start: new Date(2026, 10, 24, 12), end: new Date(2026, 10, 24, 13) }];
    expect(pickQuickSlot(day, more, now).start).toBe("2026-11-24T15:00");
  });
  it("does not put every task at 09:00", () => {
    const busy: { start: Date; end: Date }[] = [];
    const hours = new Set<string>();
    for (let i = 0; i < 4; i += 1) {
      const slot = pickQuickSlot(day, busy, now);
      hours.add(slot.start);
      busy.push({ start: new Date(slot.start), end: new Date(slot.end) });
    }
    expect(hours.size).toBe(4);
  });
});
