import { describe, expect, it } from "vitest";
import { clampSidebarWidth } from "./sidebarWidth";

describe("clampSidebarWidth", () => {
  it("keeps the width between the default and the maximum", () => {
    expect(clampSidebarWidth(100, 1920)).toBe(232);
    expect(clampSidebarWidth(900, 1920)).toBe(420);
    expect(clampSidebarWidth(300, 1920)).toBe(300);
  });
  it("leaves room for the calendar in narrow windows", () => {
    expect(clampSidebarWidth(420, 1200)).toBe(300);
    expect(clampSidebarWidth(420, 960)).toBe(232);
  });
});
