import type { CalendarEvent } from "./types";

/** Shared classes so chips, timed blocks and agenda rows agree on state. */
export function eventClasses(event: CalendarEvent): string {
  const classes: string[] = [];
  if (event.showAs === "free") classes.push("is-free");
  if (event.showAs === "tentative") classes.push("is-tentative");
  if (event.showAs === "away") classes.push("is-away");
  if (event.sensitivity !== "normal") classes.push("is-sensitive");
  return classes.join(" ");
}

/** Private and confidential events hide their description and place in views. */
export function hidesDetails(event: CalendarEvent): boolean {
  return event.sensitivity === "private" || event.sensitivity === "confidential";
}
