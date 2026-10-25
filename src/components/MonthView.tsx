import { Plus } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { localeOf, useT } from "../i18n";
import {
  endOfDay,
  formatTime,
  formatWeekday,
  isToday,
  isoWeek,
  monthGrid,
  parseDateKey,
  startOfDay,
  toDateKey,
  weekdayOrder,
} from "../lib/dates";
import { eventClasses } from "../lib/eventVisual";
import { artBackground } from "../lib/art";
import type { Occurrence } from "../lib/types";
import { useAppStore } from "../state/store";
import { useCalendarColors, useOccurrences } from "../hooks/useCalendarData";

const MAX_CHIPS = 3;

export function MonthView() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const selectedDay = useAppStore((state) => state.selectedDay);
  const weekStartsOn = useAppStore((state) => state.data.settings.weekStartsOn);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const showWeekNumbers = useAppStore((state) => state.data.settings.showWeekNumbers);
  const artTheme = useAppStore((state) => state.data.settings.artTheme);
  const selectDay = useAppStore((state) => state.selectDay);
  const setCursor = useAppStore((state) => state.setCursor);
  const setView = useAppStore((state) => state.setView);
  const openEditor = useAppStore((state) => state.openEditor);

  const locale = localeOf(language);
  const anchor = parseDateKey(cursor);

  const grid = useMemo(
    () => monthGrid(anchor.getFullYear(), anchor.getMonth(), weekStartsOn),
    [cursor, weekStartsOn],
  );

  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => grid.slice(index * 7, index * 7 + 7)),
    [grid],
  );

  const occurrences = useOccurrences(startOfDay(grid[0]), endOfDay(grid[41]));
  const colors = useCalendarColors();

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const day of grid) {
      const from = startOfDay(day).getTime();
      const to = endOfDay(day).getTime();
      map.set(
        toDateKey(day),
        occurrences.filter(
          (item) => item.end.getTime() >= from && item.start.getTime() <= to,
        ),
      );
    }
    return map;
  }, [grid, occurrences]);

  const weekdays = weekdayOrder(weekStartsOn);
  const art = artBackground(artTheme);

  return (
    <div className="month">
      <div className={`month-head ${showWeekNumbers ? "with-weeks" : ""}`}>
        {showWeekNumbers && <div className="weeknum-head" aria-hidden />}
        {weekdays.map((index) => (
          <div key={index}>{formatWeekday(new Date(2024, 0, 7 + index), locale)}</div>
        ))}
      </div>

      <div className={`month-body ${showWeekNumbers ? "with-weeks" : ""}`}>
        {art && (
          <div
            className="month-art"
            aria-hidden="true"
            style={{ backgroundImage: art }}
          />
        )}
        {weeks.map((week, weekIndex) => (
          <div className={`month-week ${showWeekNumbers ? "with-weeks" : ""}`} key={weekIndex}>
            {showWeekNumbers && (
              <div className="weeknum" title={t("common.week", { number: isoWeek(week[0]) })}>
                {isoWeek(week[0])}
              </div>
            )}
            {week.map((day) => {
              const key = toDateKey(day);
              const items = byDay.get(key) ?? [];
              const outside = day.getMonth() !== anchor.getMonth();
              const classes = [
                "month-cell",
                outside ? "out" : "",
                isToday(day) ? "today" : "",
                key === selectedDay ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={key}
                  className={classes}
                  onClick={() => {
                    selectDay(key);
                    setCursor(key);
                  }}
                  onDoubleClick={() => openEditor({ date: key, time: "09:00" })}
                >
                  <span className="daynum">{day.getDate()}</span>

                  <button
                    className="cell-add"
                    title={t("actions.newEvent")}
                    aria-label={`${t("actions.newEvent")} ${day.getDate()}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectDay(key);
                      setCursor(key);
                      openEditor({ date: key, time: "09:00" });
                    }}
                  >
                    <Plus size={14} />
                  </button>

                  {items.slice(0, MAX_CHIPS).map((item) => (
                    <button
                      key={item.key}
                      className={`chip ${eventClasses(item.event)}`}
                      style={
                        {
                          "--event": colors[item.event.calendarId] ?? "var(--accent)",
                        } as CSSProperties
                      }
                      title={`${item.event.title} · ${formatTime(item.start, locale, use24h)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditor({ id: item.event.id, date: toDateKey(item.start) });
                      }}
                    >
                      {!item.event.allDay && (
                        <span className="t">{formatTime(item.start, locale, use24h)}</span>
                      )}
                      <span>{item.event.title || t("notes.untitled")}</span>
                    </button>
                  ))}

                  {items.length > MAX_CHIPS && (
                    <span
                      className="more"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectDay(key);
                        setCursor(key);
                        setView("day");
                      }}
                    >
                      {t("common.more", { count: items.length - MAX_CHIPS })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
