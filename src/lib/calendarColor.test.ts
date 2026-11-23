import { describe, expect, it } from "vitest";
import { themedCalendarColor } from "./calendarColor";

describe("themedCalendarColor", () => {
  it("maps the default teal to the accent in sonoma and botanico", () => {
    expect(themedCalendarColor("#15BED1", "sonoma", "light")).toBe("var(--accent)");
    expect(themedCalendarColor("#15bed1", "botanico", "dark")).toBe("var(--accent)");
  });
  it("follows the accent in sepia and midnight even in popover", () => {
    expect(themedCalendarColor("#15bed1", "popover", "sepia")).toBe("var(--accent)");
    expect(themedCalendarColor("#15bed1", "popover", "midnight")).toBe("var(--accent)");
  });
  it("keeps custom colors, popover and Piel Roja untouched", () => {
    expect(themedCalendarColor("#8e24aa", "sonoma", "light")).toBe("#8e24aa");
    expect(themedCalendarColor("#15bed1", "popover", "light")).toBe("#15bed1");
    expect(themedCalendarColor("#15bed1", "sonoma", "tradicional")).toBe("#15bed1");
  });
});
