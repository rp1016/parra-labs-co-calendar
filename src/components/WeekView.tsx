import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  endOfDay,
  formatTime,
  formatTimeInZone,
  formatWeekday,
  formatZoneName,
  isToday,
  isoWeek,
  minutesOfDay,
  pad2,
  parseDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
} from "../lib/dates";
import { eventClasses } from "../lib/eventVisual";
import { layoutDay } from "../lib/layout";
import { TIME_ZONES, type Occurrence } from "../lib/types";
import { useAppStore } from "../state/store";
import { useCalendarColors, useNow, useOccurrences } from "../hooks/useCalendarData";

const HOUR = 80;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface Placed {
  occurrence: Occurrence;
  top: number;
  height: number;
  left: number;
  width: number;
}

function place(occurrence: Occurrence, dayStart: Date, column: number, columns: number): Placed {
  const dayFrom = dayStart.getTime();
  const dayTo = addDays(dayStart, 1).getTime();
  const from = Math.max(occurrence.start.getTime(), dayFrom);
  const to = Math.min(occurrence.end.getTime(), dayTo);
  const startMinutes = Math.max(0, (from - dayFrom) / 60_000);
  const endMinutes = Math.min(1440, (to - dayFrom) / 60_000);
  return {
    occurrence,
    top: (startMinutes / 60) * HOUR,
    height: Math.max(20, ((endMinutes - startMinutes) / 60) * HOUR - 2),
    left: (column / columns) * 100,
    width: (1 / columns) * 100,
  };
}

export function WeekView() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const selectedDay = useAppStore((state) => state.selectedDay);
  const weekStartsOn = useAppStore((state) => state.data.settings.weekStartsOn);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const showWeekNumbers = useAppStore((state) => state.data.settings.showWeekNumbers);
  const secondTimeZone = useAppStore((state) => state.data.settings.secondTimeZone);
  const selectDay = useAppStore((state) => state.selectDay);
  const setCursor = useAppStore((state) => state.setCursor);
  const setView = useAppStore((state) => state.setView);
  const openEditor = useAppStore((state) => state.openEditor);

  const locale = localeOf(language);
  const anchor = parseDateKey(cursor);
  const start = useMemo(() => startOfWeek(anchor, weekStartsOn), [cursor, weekStartsOn]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const zoneCity = secondTimeZone
    ? (TIME_ZONES.find((zone) => zone.id === secondTimeZone)?.city ?? secondTimeZone)
    : null;
  const zoneName = secondTimeZone ? formatZoneName(start, secondTimeZone, locale) : null;
  const occurrences = useOccurrences(start, endOfDay(days[6]));
  const colors = useCalendarColors();
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep the current hour in view, like a desktop calendar does.
    const target = (minutesOfDay(new Date()) / 60) * HOUR - HOUR * 1.5;
    scrollRef.current?.scrollTo({ top: Math.max(0, target) });
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const day of days) {
      const from = startOfDay(day).getTime();
      const to = addDays(startOfDay(day), 1).getTime();
      map.set(
        toDateKey(day),
        occurrences.filter(
          (item) => item.end.getTime() > from && item.start.getTime() < to,
        ),
      );
    }
    return map;
  }, [days, occurrences]);

  const hasAllDay = days.some((day) =>
    (byDay.get(toDateKey(day)) ?? []).some((item) => item.event.allDay),
  );

  const nowTop = days.some((day) => isToday(day))
    ? (minutesOfDay(now) / 60) * HOUR
    : null;

  const hourLabel = (hour: number): string => {
    if (use24h) return `${pad2(hour)}:00`;
    const suffix = hour < 12 ? "am" : "pm";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display} ${suffix}`;
  };

  return (
    <div
      className={`week ${secondTimeZone ? "has-tz" : ""}`}
      style={{ "--hour-h": `${HOUR}px` } as CSSProperties}
    >
      <div className="week-head">
        <div className="gutter">
          {showWeekNumbers && (
            <span className="weeknum-badge">{t("common.week", { number: isoWeek(start) })}</span>
          )}
          {zoneCity && <span className="zone-name" title={`${zoneCity} · ${zoneName}`}>{zoneCity}</span>}
        </div>
        {days.map((day) => {
          const key = toDateKey(day);
          return (
            <button
              key={key}
              className={`week-day ${isToday(day) ? "today" : ""} ${
                key === selectedDay ? "selected" : ""
              }`}
              onClick={() => {
                selectDay(key);
                setCursor(key);
              }}
            >
              <span className="week-pill">
                <span className="dn">{day.getDate()}</span>
                <span className="wd">{formatWeekday(day, locale)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {hasAllDay && (
        <div className="allday-row">
          <div className="allday-label">{t("common.allDay")}</div>
          {days.map((day) => {
            const items = (byDay.get(toDateKey(day)) ?? []).filter((item) => item.event.allDay);
            return (
              <div
                className={`allday-cell ${isToday(day) ? "today" : ""}`}
                key={toDateKey(day)}
              >
                {items.slice(0, 2).map((item) => (
                  <button
                    key={item.key}
                    className={`chip ${eventClasses(item.event)}`}
                    style={
                      { "--event": colors[item.event.calendarId] ?? "var(--accent)" } as CSSProperties
                    }
                    onClick={() => openEditor({ id: item.event.id, date: toDateKey(day) })}
                  >
                    <span>{item.event.title || t("notes.untitled")}</span>
                  </button>
                ))}
                {items.length > 2 && (
                  <span
                    className="more"
                    onClick={() => {
                      selectDay(toDateKey(day));
                      setCursor(toDateKey(day));
                      setView("day");
                    }}
                  >
                    {t("common.more", { count: items.length - 2 })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="week-scroll" ref={scrollRef}>
        <div className="week-grid">
          <div className="hours">
            {HOURS.map((hour) => {
              const zoned = secondTimeZone
                ? formatTimeInZone(
                    new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour),
                    secondTimeZone,
                    locale,
                    use24h,
                  )
                : null;
              return (
                <div className="hour-slot" key={hour}>
                  {hour > 0 && (
                    <span className="hour-label">
                      <span>{hourLabel(hour)}</span>
                      {zoned && <span className="second">{zoned}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const key = toDateKey(day);
            const dayStart = startOfDay(day);
            const items = (byDay.get(key) ?? []).filter((item) => !item.event.allDay);
            const positioned = layoutDay(items).map((slot) =>
              place(slot.item, dayStart, slot.column, slot.columns),
            );

            return (
              <div className={`week-col ${isToday(day) ? "today" : ""}`} key={key}>
                {HOURS.map((hour) => (
                  <div
                    className="hour-slot"
                    key={hour}
                    onClick={() => openEditor({ date: key, time: `${pad2(hour)}:00` })}
                  />
                ))}

                {positioned.map(({ occurrence, top, height, left, width }) => (
                  <button
                    key={occurrence.key}
                    className={`timed ${eventClasses(occurrence.event)}`}
                    style={
                      {
                        top,
                        height,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        "--event": colors[occurrence.event.calendarId] ?? "var(--accent)",
                      } as CSSProperties
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditor({ id: occurrence.event.id, date: toDateKey(occurrence.start) });
                    }}
                    title={occurrence.event.title}
                  >
                    <b>{occurrence.event.title || t("notes.untitled")}</b>
                    <br />
                    <span>{formatTime(occurrence.start, locale, use24h)}</span>
                  </button>
                ))}

              </div>
            );
          })}

          {nowTop !== null && <div className="now-line" style={{ top: nowTop }} />}
        </div>
      </div>
    </div>
  );
}
