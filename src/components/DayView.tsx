import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Clock, Lock, MapPin, Plus } from "lucide-react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  endOfDay,
  formatLongDate,
  formatMonthYear,
  formatTime,
  formatTimeInZone,
  formatZoneName,
  isToday,
  minutesOfDay,
  pad2,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "../lib/dates";
import { eventClasses, hidesDetails } from "../lib/eventVisual";
import { layoutDay } from "../lib/layout";
import { TIME_ZONES } from "../lib/types";
import { useAppStore } from "../state/store";
import { useCalendarColors, useNow, useOccurrences } from "../hooks/useCalendarData";

const HOUR = 56;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function DayView() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const secondTimeZone = useAppStore((state) => state.data.settings.secondTimeZone);
  const openEditor = useAppStore((state) => state.openEditor);

  const locale = localeOf(language);
  const day = useMemo(() => parseDateKey(cursor), [cursor]);
  const dayStart = useMemo(() => startOfDay(day), [day]);
  const zoneCity = secondTimeZone
    ? (TIME_ZONES.find((zone) => zone.id === secondTimeZone)?.city ?? secondTimeZone)
    : null;
  const zoneClock = secondTimeZone
    ? `${formatTimeInZone(dayStart, secondTimeZone, locale, use24h)} · ${formatZoneName(dayStart, secondTimeZone, locale)}`
    : null;
  const occurrences = useOccurrences(dayStart, endOfDay(day));
  const colors = useCalendarColors();
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: HOUR * 7 - 8 });
  }, []);

  const timed = occurrences.filter((item) => !item.event.allDay);
  const allDay = occurrences.filter((item) => item.event.allDay);
  const positioned = useMemo(
    () =>
      layoutDay(timed).map((slot) => {
        const from = Math.max(slot.item.start.getTime(), dayStart.getTime());
        const to = Math.min(slot.item.end.getTime(), addDays(dayStart, 1).getTime());
        const startMinutes = Math.max(0, (from - dayStart.getTime()) / 60_000);
        const endMinutes = Math.min(1440, (to - dayStart.getTime()) / 60_000);
        return {
          occurrence: slot.item,
          top: (startMinutes / 60) * HOUR,
          height: Math.max(26, ((endMinutes - startMinutes) / 60) * HOUR - 3),
          left: (slot.column / slot.columns) * 100,
          width: (1 / slot.columns) * 100,
        };
      }),
    [timed, dayStart],
  );

  const currentMinutes = isToday(day) ? minutesOfDay(now) : null;

  return (
    <div className={`day-view ${secondTimeZone ? "has-tz" : ""}`}>
      <div className="day-summary">
        <div className="day-big">{day.getDate()}</div>
        <div className="day-heading">
          <div className="day-dow">{formatLongDate(day, locale).split(",")[0]}</div>
          <div className="day-month">{formatMonthYear(day, locale)}</div>
          {zoneCity && zoneClock && (
            <div className="day-zone">
              {zoneCity} · {zoneClock}
            </div>
          )}
        </div>
        {allDay.length > 0 && (
          <div className="day-allday">
            {allDay.map((item) => (
              <button
                key={item.key}
                className={`chip ${eventClasses(item.event)}`}
                style={
                  { "--event": colors[item.event.calendarId] ?? "var(--accent)" } as CSSProperties
                }
                onClick={() => openEditor({ id: item.event.id, date: cursor })}
              >
                <span>{item.event.title || t("notes.untitled")}</span>
              </button>
            ))}
          </div>
        )}
        <button className="btn primary" onClick={() => openEditor({ date: cursor })}>
          <Plus size={15} />
          {t("actions.newEvent")}
        </button>
      </div>

      <div className="week-scroll" ref={scrollRef}>
        <div className="week-grid day-grid">
          <div className="hours">
            {HOURS.map((hour) => {
              const zoned = secondTimeZone
                ? formatTimeInZone(
                    new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), hour),
                    secondTimeZone,
                    locale,
                    use24h,
                  )
                : null;
              return (
                <div className="hour-slot" key={hour} style={{ height: HOUR }}>
                  {hour > 0 && (
                    <span className="hour-label">
                      <span>{`${pad2(hour)}:00`}</span>
                      {zoned && <span className="second">{zoned}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="week-col day-col">
            {HOURS.map((hour) => (
              <div
                className="hour-slot"
                key={hour}
                style={{ height: HOUR }}
                onClick={() => openEditor({ date: cursor, time: `${pad2(hour)}:00` })}
              />
            ))}

            {positioned.map(({ occurrence, top, height, left, width }) => (
              <button
                key={occurrence.key}
                className={`timed day-timed ${eventClasses(occurrence.event)}`}
                style={
                  {
                    top,
                    height,
                    left: `calc(${left}% + 4px)`,
                    width: `calc(${width}% - 8px)`,
                    "--event": colors[occurrence.event.calendarId] ?? "var(--accent)",
                  } as CSSProperties
                }
                onClick={(event) => {
                  event.stopPropagation();
                  openEditor({ id: occurrence.event.id, date: toDateKey(occurrence.start) });
                }}
              >
                <b>{occurrence.event.title || t("notes.untitled")}</b>
                <span className="day-time">
                  <Clock size={11} />
                  {formatTime(occurrence.start, locale, use24h)} –{" "}
                  {formatTime(occurrence.end, locale, use24h)}
                </span>
                {hidesDetails(occurrence.event) ? (
                  <span className="day-place">
                    <Lock size={11} />
                    {t("event.privateDetails")}
                  </span>
                ) : (
                  <>
                    {occurrence.event.location && (
                      <span className="day-place">
                        <MapPin size={11} />
                        {occurrence.event.location}
                      </span>
                    )}
                    {occurrence.event.notes && (
                      <span className="day-note">{occurrence.event.notes}</span>
                    )}
                  </>
                )}
              </button>
            ))}

            {currentMinutes !== null && (
              <div className="now-line" style={{ top: (currentMinutes / 60) * HOUR }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
