import { useMemo, type CSSProperties } from "react";
import { CalendarRange, Lock, MapPin } from "lucide-react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  daysBetween,
  endOfDay,
  formatLongDate,
  formatTime,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "../lib/dates";
import { eventClasses, hidesDetails } from "../lib/eventVisual";
import type { Occurrence } from "../lib/types";
import { useAppStore } from "../state/store";
import { useCalendarColors, useOccurrences } from "../hooks/useCalendarData";

const DAYS_AHEAD = 90;

export function AgendaView() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const openEditor = useAppStore((state) => state.openEditor);

  const locale = localeOf(language);
  const start = useMemo(() => startOfDay(parseDateKey(cursor)), [cursor]);
  const end = useMemo(() => endOfDay(addDays(start, DAYS_AHEAD)), [start]);
  const occurrences = useOccurrences(start, end);
  const colors = useCalendarColors();

  const groups = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const item of occurrences) {
      const key = toDateKey(item.start);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [occurrences]);

  if (groups.length === 0) {
    return (
      <div className="empty" style={{ flex: 1 }}>
        <CalendarRange size={30} />
        <b>{t("empty.agenda")}</b>
        <span>{t("empty.addHint")}</span>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="agenda">
      {groups.map(([key, items]) => {
        const day = parseDateKey(key);
        const diff = daysBetween(today, day);
        const relative =
          diff === 0
            ? t("common.today")
            : diff === 1
              ? t("common.tomorrow")
              : diff === -1
                ? t("common.yesterday")
                : null;

        return (
          <section className="agenda-day" key={key}>
            <div className="agenda-day-head">
              <span className="label">{formatLongDate(day, locale)}</span>
              {relative && <span className="rel">{relative}</span>}
            </div>

            {items.map((item) => (
              <button
                key={item.key}
                className={`agenda-row ${eventClasses(item.event)}`}
                onClick={() => openEditor({ id: item.event.id, date: key })}
              >
                <span
                  className="agenda-bar"
                  style={
                    { "--event": colors[item.event.calendarId] ?? "var(--accent)" } as CSSProperties
                  }
                />
                <span className="agenda-time">
                  {item.event.allDay
                    ? t("common.allDay")
                    : `${formatTime(item.start, locale, use24h)} – ${formatTime(
                        item.end,
                        locale,
                        use24h,
                      )}`}
                </span>
                <span className="agenda-main">
                  <span className="agenda-title">
                    {item.event.title || t("notes.untitled")}
                  </span>
                  {hidesDetails(item.event) ? (
                    <span className="agenda-sub">
                      <Lock size={11} /> {t("event.privateDetails")}
                    </span>
                  ) : (
                    <>
                      {item.event.location && (
                        <span className="agenda-sub">
                          <MapPin size={11} /> {item.event.location}
                        </span>
                      )}
                      {item.event.notes && <span className="agenda-sub">{item.event.notes}</span>}
                    </>
                  )}
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
