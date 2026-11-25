export const DEFAULT_SIDEBAR_WIDTH = 232;
const MAX_SIDEBAR_WIDTH = 420;
/** Room that must stay for the calendar grid and the right rail. */
const RESERVED_FOR_CALENDAR = 900;

export function maxSidebarWidth(viewport: number): number {
  return Math.max(DEFAULT_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, viewport - RESERVED_FOR_CALENDAR));
}

export function clampSidebarWidth(width: number, viewport: number): number {
  return Math.round(Math.min(maxSidebarWidth(viewport), Math.max(DEFAULT_SIDEBAR_WIDTH, width)));
}
