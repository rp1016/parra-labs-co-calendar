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
  it("skips busy hours", () => {
    const busy = [{ start: new Date(2026, 10, 24, 9), end: new Date(2026, 10, 24, 11, 30) }];
    expect(pickQuickSlot(day, busy, now).start).toBe("2026-11-24T12:00");
  });
});
