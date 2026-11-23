import { describe, expect, it } from "vitest";
import { moonPhaseOfDay } from "./moon";

describe("moonPhaseOfDay", () => {
  it("finds known 2024 phases", () => {
    expect(moonPhaseOfDay(new Date(2024, 0, 11))).toBe("new");
    expect(moonPhaseOfDay(new Date(2024, 0, 25))).toBe("full");
    expect(moonPhaseOfDay(new Date(2024, 0, 18))).toBe("first");
  });
  it("is empty on ordinary days", () => {
    expect(moonPhaseOfDay(new Date(2024, 0, 14))).toBeNull();
  });
});
