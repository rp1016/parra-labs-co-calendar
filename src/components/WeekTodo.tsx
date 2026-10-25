import { Check, ChevronDown, ListTodo, Lock, Plus } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  endOfDay,
  formatLongDate,
  formatTime,
  formatWeekday,
  isToday,
  isoWeek,
  parseDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
} from "../lib/dates";
import { hidesDetails } from "../lib/eventVisual";
import { formatWeekRange, groupWeekTodos, isTodoDone, todoStats } from "../lib/weekTodo";
import { useCalendarColors, useOccurrences } from "../hooks/useCalendarData";
import { useAppStore } from "../state/store";

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

/**
 * Compact checklist of everything scheduled in the visible week. It respects
 * visible calendars and the active tag filter, and groups items by start date.
 */
export function WeekTodo() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const calendars = useAppStore((state) => state.data.calendars);
  const weekStartsOn = useAppStore((state) => state.data.settings.weekStartsOn);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const selectDay = useAppStore((state) => state.selectDay);
  const setCursor = useAppStore((state) => state.setCursor);
  const setSection = useAppStore((state) => state.setSection);
  const openEditor = useAppStore((state) => state.openEditor);
  const toggleEventDone = useAppStore((state) => state.toggleEventDone);

  const [open, setOpen] = useState(true);

  const locale = localeOf(language);
  const weekStart = useMemo(
    () => startOfWeek(parseDateKey(cursor), weekStartsOn),
    [cursor, weekStartsOn],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const occurrences = useOccurrences(startOfDay(weekStart), endOfDay(weekEnd));
  const colors = useCalendarColors();

  const holidayIds = useMemo(
    () => new Set(calendars.filter((calendar) => calendar.kind === "holiday").map(({ id }) => id)),
    [calendars],
  );
  const days = useMemo(
    () =>
      groupWeekTodos(
        weekStart,
        occurrences.filter((item) => !holidayIds.has(item.event.calendarId)),
      ),
    [weekStart, occurrences, holidayIds],
  );
  const stats = useMemo(() => todoStats(days), [days]);
  const shownDays = days.filter((day) => day.items.length > 0);
  const progress = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  const goToDay = (key: string) => {
    selectDay(key);
    setCursor(key);
    setSection("calendar");
  };

  return (
    <section className={`week-todo ${open ? "" : "collapsed"}`} aria-label={t("weekTodo.title")}>
      <div className="week-todo-head">
        <button
          className="week-todo-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <ChevronDown size={13} className={`chev ${open ? "" : "closed"}`} />
          <ListTodo size={14} className="list" />
          <span>{t("weekTodo.title")}</span>
        </button>

        {stats.total > 0 &&
          (stats.pending > 0 ? (
            <span
              className="week-todo-count"
              title={t("weekTodo.summary", { pending: stats.pending, total: stats.total })}
            >
              {stats.pending}
            </span>
          ) : (
            <span
              className="week-todo-count complete"
              title={t("weekTodo.summary", { pending: 0, total: stats.total })}
            >
              <Check size={10} strokeWidth={3.4} />
            </span>
          ))}
      </div>

      {open && (
        <div className="week-todo-body">
          <div className="week-todo-sub">
            <span>{t("weekTodo.week", { number: isoWeek(weekStart) })}</span>
            <span>{formatWeekRange(weekStart, weekEnd, locale)}</span>
          </div>

          {stats.total > 0 && (
            <div
              className="week-todo-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={stats.total}
              aria-valuenow={stats.done}
              aria-label={t("weekTodo.summary", {
                pending: stats.pending,
                total: stats.total,
              })}
            >
              <i style={{ width: `${progress}%` }} />
            </div>
          )}

          {stats.total === 0 ? (
            <div className="week-todo-blank">
              <p>{t("weekTodo.empty")}</p>
              <button onClick={() => openEditor({ date: cursor })}>
                <Plus size={13} />
                {t("weekTodo.add")}
              </button>
            </div>
          ) : (
            shownDays.map((day) => {
              const today = isToday(day.date);
              return (
                <div className="week-todo-day" key={day.key}>
                  <div className={`week-todo-day-head ${today ? "today" : ""}`}>
                    <button
                      className="week-todo-day-label"
                      title={formatLongDate(day.date, locale)}
                      onClick={() => goToDay(day.key)}
                    >
                      <span>{capitalize(formatWeekday(day.date, locale))}</span>
                      <b>{day.date.getDate()}</b>
                      {today && <i>{t("common.today")}</i>}
                    </button>
                    <button
                      className="week-todo-add"
                      title={t("event.new")}
                      aria-label={`${t("event.new")} · ${formatLongDate(day.date, locale)}`}
                      onClick={() => {
                        selectDay(day.key);
                        setCursor(day.key);
                        openEditor({ date: day.key });
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {day.items.map((item) => {
                    const done = isTodoDone(item);
                    const hidden = hidesDetails(item.event);
                    const title = item.event.title || t("notes.untitled");
                    const timeLabel = item.event.allDay
                      ? t("common.allDay")
                      : formatTime(item.start, locale, use24h);

                    return (
                      <div
                        className={`week-todo-item ${done ? "done" : ""}`}
                        key={item.key}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          className={`week-todo-check ${done ? "done" : ""}`}
                          aria-label={
                            done
                              ? t("weekTodo.markPending", { title })
                              : t("weekTodo.markDone", { title })
                          }
                          onClick={() =>
                            toggleEventDone(item.event.id, toDateKey(item.start))
                          }
                        >
                          {done && <Check size={10} strokeWidth={3.4} />}
                        </button>

                        <button
                          type="button"
                          className="week-todo-main"
                          title={`${title} · ${timeLabel}`}
                          onClick={() =>
                            openEditor({ id: item.event.id, date: toDateKey(item.start) })
                          }
                        >
                          <i
                            className="week-todo-dot"
                            style={
                              {
                                "--event":
                                  colors[item.event.calendarId] ?? "var(--accent)",
                              } as CSSProperties
                            }
                          />
                          <span className="week-todo-time">{timeLabel}</span>
                          <span className="week-todo-label">
                            {hidden && <Lock size={9} />}
                            {title}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
