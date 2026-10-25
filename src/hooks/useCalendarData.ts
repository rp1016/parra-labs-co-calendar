import { useEffect, useMemo, useState } from "react";
import { occurrencesBetween, sortOccurrences } from "../lib/recurrence";
import type { Occurrence } from "../lib/types";
import { useAppStore, visibleEvents } from "../state/store";

/** Calendar id → color, so every view paints events the same way. */
export function useCalendarColors(): Record<string, string> {
  const calendars = useAppStore((state) => state.data.calendars);
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const calendar of calendars) map[calendar.id] = calendar.color;
    return map;
  }, [calendars]);
}

export function useOccurrences(rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const data = useAppStore((state) => state.data);
  const tagFilter = useAppStore((state) => state.tagFilter);
  const from = rangeStart.getTime();
  const to = rangeEnd.getTime();

  return useMemo(() => {
    const start = new Date(from);
    const end = new Date(to);
    const items = visibleEvents(data).flatMap((event) => occurrencesBetween(event, start, end));
    const filtered = tagFilter
      ? items.filter((item) => item.event.tags.includes(tagFilter))
      : items;
    return sortOccurrences(filtered);
  }, [data, tagFilter, from, to]);
}

/** Wall clock that re-renders every half minute, for "now" indicators. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
