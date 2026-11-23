import type { MiniStyle, ThemeName } from "./types";

/** The color of the seeded "Personal" calendar. */
const DEFAULT_CALENDAR_COLOR = "#15bed1";

/**
 * The seeded calendar color is teal, which clashes with the red (Sonoma) and
 * terracotta (Botanico) styles and with the Sepia/Midnight themes, so there it
 * follows the active accent. Colors
 * the user picked, holiday calendars and the Piel Roja theme are left alone.
 */
export function themedCalendarColor(color: string, style: MiniStyle, theme: ThemeName): string {
  if (theme === "tradicional" || style === "tradicional") return color;
  // Popover keeps teal, except in the color themes that bring their own accent.
  if (style === "popover" && theme !== "sepia" && theme !== "midnight") return color;
  return color.toLowerCase() === DEFAULT_CALENDAR_COLOR ? "var(--accent)" : color;
}
