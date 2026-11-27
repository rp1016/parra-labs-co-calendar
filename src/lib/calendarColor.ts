import type { MiniStyle, ThemeName } from "./types";

/** The color of the seeded "Personal" calendar. */
const DEFAULT_CALENDAR_COLOR = "#15bed1";

/**
 * The seeded calendar color is teal, which clashes with the red (Sonoma, Piel
 * Roja) and terracotta (Botanico) looks and with the Sepia/Midnight themes, so
 * there it follows the active accent. Colors the user picked and holiday
 * calendars are left alone.
 */
export function themedCalendarColor(color: string, style: MiniStyle, theme: ThemeName): string {
  // Popover keeps teal, except in the themes that bring their own accent.
  const themeHasAccent =
    theme === "sepia" || theme === "midnight" || theme === "tradicional" || theme === "bristol";
  if (style === "popover" && !themeHasAccent) return color;
  return color.toLowerCase() === DEFAULT_CALENDAR_COLOR ? "var(--accent)" : color;
}
