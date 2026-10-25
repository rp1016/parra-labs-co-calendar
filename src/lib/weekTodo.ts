import { addDays, toDateKey } from "./dates";
import type { Occurrence } from "./types";

export interface TodoDay {
  key: string;
  date: Date;
  items: Occurrence[];
}

/**
 * Buckets occurrences into the seven days of the week that starts at
 * `weekStart`. Items are grouped by their start date: a task belongs to the day
 * it is scheduled for, not to every day it happens to overlap.
 */
export function groupWeekTodos(weekStart: Date, occurrences: Occurrence[]): TodoDay[] {
  const days: TodoDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { key: toDateKey(date), date, items: [] };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));

  for (const item of occurrences) {
    byKey.get(toDateKey(item.start))?.items.push(item);
  }
  return days;
}

/** Completion is per occurrence: a repeating task can be done only one week. */
export function isTodoDone(item: Occurrence): boolean {
  return (item.event.doneDates ?? []).includes(toDateKey(item.start));
}

export function todoStats(days: TodoDay[]): { done: number; total: number; pending: number } {
  let done = 0;
  let total = 0;
  for (const day of days) {
    for (const item of day.items) {
      total += 1;
      if (isTodoDone(item)) done += 1;
    }
  }
  return { done, total, pending: total - done };
}

/** "19 – 25 oct", or "28 sept – 4 oct" when the week crosses a month. */
export function formatWeekRange(start: Date, end: Date, locale: string): string {
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" as const }),
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}
