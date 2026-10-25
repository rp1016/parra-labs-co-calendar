import { useEffect } from "react";
import { notify } from "../lib/api";
import { formatTime, toDateKey } from "../lib/dates";
import { occurrencesBetween } from "../lib/recurrence";
import { useAppStore, visibleEvents } from "../state/store";

/** Checks once a minute while the app is open. A reminder is only delivered
 *  during the two minutes after its time, so opening the app later does not
 *  replay the whole week. */
export function useReminders(): void {
  useEffect(() => {
    const fired = new Set<string>();
    let cancelled = false;

    const check = () => {
      const state = useAppStore.getState();
      const settings = state.data.settings;
      if (!settings.notifications || cancelled) return;

      const now = new Date();
      const candidates = visibleEvents(state.data).filter(
        (event) => event.reminderMinutes !== null && !event.allDay,
      );
      if (candidates.length === 0) return;

      const maxLead = Math.max(
        60,
        ...candidates.map((event) => event.reminderMinutes ?? 0),
      );
      const from = new Date(now.getTime() - 5 * 60_000);
      const to = new Date(now.getTime() + (maxLead + 5) * 60_000);
      const grace = 2 * 60_000;

      for (const event of candidates) {
        for (const occurrence of occurrencesBetween(event, from, to)) {
          if ((event.doneDates ?? []).includes(toDateKey(occurrence.start))) continue;
          const reminderAt =
            occurrence.start.getTime() - (event.reminderMinutes ?? 0) * 60_000;
          if (reminderAt > now.getTime() || reminderAt < now.getTime() - grace) continue;
          if (fired.has(occurrence.key)) continue;
          fired.add(occurrence.key);

          const time = formatTime(occurrence.start, "es-ES", settings.use24h);
          void notify(
            event.title || "CalendarPRO",
            [time, event.location].filter(Boolean).join(" · "),
          ).catch(() => undefined);
        }
      }
    };

    const timer = setInterval(check, 30_000);
    check();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
}
