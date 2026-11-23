import { useMemo, type CSSProperties } from "react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  endOfDay,
  formatTime,
  formatWeekday,
  isoWeek,
  isSameDay,
  monthGrid,
  parseDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
  weekdayOrder,
} from "../lib/dates";
import { artBackground } from "../lib/art";
import { formatWeekRange, groupWeekTodos, isTodoDone, todoStats } from "../lib/weekTodo";
import { useCalendarColors, useOccurrences } from "../hooks/useCalendarData";
import { useAppStore } from "../state/store";

const MAX_ITEMS = 12;
const RING = 2 * Math.PI * 25;

/** Starts the "print this week" flow: the sheet below is only shown while the
 *  `data-print="week"` flag is on the root element. */
export function printWeek(): void {
  const root = document.documentElement;
  root.dataset.print = "week";
  const finish = () => {
    delete root.dataset.print;
    window.removeEventListener("afterprint", finish);
  };
  window.addEventListener("afterprint", finish);
  setTimeout(() => window.print(), 60);
}

function capitalize(value: string, locale: string): string {
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

/** Printable planner for the visible week, US Letter landscape. It copies the
 *  active style (accent, fonts, title treatment) and the illustration theme. */
export function PrintWeek() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const calendars = useAppStore((state) => state.data.calendars);
  const settings = useAppStore((state) => state.data.settings);
  const { weekStartsOn, language, use24h } = settings;

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
  const holidays = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of occurrences) {
      if (holidayIds.has(item.event.calendarId)) map.set(toDateKey(item.start), item.event.title);
    }
    return map;
  }, [occurrences, holidayIds]);
  const stats = useMemo(() => todoStats(days), [days]);

  const monthName = capitalize(
    new Intl.DateTimeFormat(locale, { month: "long" }).format(weekStart),
    locale,
  );
  const year = weekStart.getFullYear();
  const grid = useMemo(
    () => monthGrid(weekStart.getFullYear(), weekStart.getMonth(), weekStartsOn),
    [weekStart, weekStartsOn],
  );
  const letters = weekdayOrder(weekStartsOn).map((index) =>
    formatWeekday(new Date(2024, 0, 7 + index), locale, "narrow"),
  );
  const ratio = stats.total === 0 ? 0 : stats.done / stats.total;
  const art = artBackground(settings.artTheme);
  const today = new Date();

  return (
    <section className="print-week-sheet" aria-hidden="true">
      {art && <div className="pw-art" style={{ backgroundImage: art }} />}

      <header className="pw-head">
        <div className="pw-title">
          <span className="pw-month">{monthName}</span>
          <span className="pw-year">{year}</span>
        </div>
        <div className="pw-week">
          {t("weekTodo.week", { number: isoWeek(weekStart) })} ·{" "}
          {formatWeekRange(weekStart, weekEnd, locale)}
        </div>
      </header>

      <div className="pw-body">
        <aside className="pw-left">
          <div className="pw-box pw-mini">
            <div className="pw-mini-title">
              {monthName} {year}
            </div>
            <div className="pw-mini-grid">
              {letters.map((letter, index) => (
                <b key={`${letter}-${index}`}>{letter}</b>
              ))}
              {grid.map((day) => {
                const inWeek = day >= startOfDay(weekStart) && day <= endOfDay(weekEnd);
                const outside = day.getMonth() !== weekStart.getMonth();
                const className = [inWeek ? "in-week" : "", outside ? "out" : ""]
                  .join(" ")
                  .trim();
                return (
                  <span key={toDateKey(day)} className={className || undefined}>
                    {day.getDate()}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="pw-box pw-priorities">
            <h3>{t("printWeek.priorities")}</h3>
            {[0, 1, 2].map((index) => (
              <div className="pw-line" key={index}>
                <i className="pw-cb" />
              </div>
            ))}
          </div>

          <div className="pw-box pw-progress">
            <div className="pw-ring">
              <svg viewBox="0 0 60 60" aria-hidden="true">
                <circle cx="30" cy="30" r="25" className="pw-ring-track" />
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  className="pw-ring-value"
                  strokeDasharray={`${ratio * RING} ${RING}`}
                />
              </svg>
              <b>{stats.done}</b>
            </div>
            <p>
              <strong>{t("printWeek.done", { done: stats.done, total: stats.total })}</strong>
              <br />
              <span>{t("printWeek.progress")}</span>
            </p>
          </div>

          <div className="pw-box pw-notes">
            <h3>{t("printWeek.notes")}</h3>
          </div>
        </aside>

        <div className="pw-cards">
          {days.map((day) => {
            const isToday = isSameDay(day.date, today);
            const shown = day.items.slice(0, MAX_ITEMS);
            const extra = day.items.length - shown.length;
            const holiday = holidays.get(day.key);
            return (
              <section className={`pw-card ${isToday ? "today" : ""}`} key={day.key}>
                <div className="pw-card-head">
                  <span className="pw-dayname">
                    {capitalize(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(day.date), locale)}
                  </span>
                  <span className="pw-daynum">{day.date.getDate()}</span>
                </div>
                {holiday && <div className="pw-holiday">{holiday}</div>}
                <ul>
                  {shown.map((item) => {
                    const done = isTodoDone(item);
                    return (
                      <li
                        className={`pw-item ${done ? "done" : ""}`}
                        key={item.key}
                        style={
                          { "--c": colors[item.event.calendarId] ?? "var(--accent)" } as CSSProperties
                        }
                      >
                        <i className={`pw-cb ${done ? "on" : ""}`} />
                        <span className="pw-time">
                          {item.event.allDay
                            ? t("common.allDay")
                            : formatTime(item.start, locale, use24h)}
                        </span>
                        <span className="pw-name">{item.event.title || t("notes.untitled")}</span>
                      </li>
                    );
                  })}
                  {extra > 0 && <li className="pw-more">{t("printWeek.more", { count: extra })}</li>}
                </ul>
                <div className="pw-rule" />
                <div className="pw-rule" />
              </section>
            );
          })}

          <section className="pw-card pw-pending">
            <div className="pw-card-head">
              <span className="pw-dayname">{t("printWeek.pending")}</span>
              <span className="pw-hint">{t("printWeek.pendingHint")}</span>
            </div>
            {[0, 1, 2, 3, 4].map((index) => (
              <div className="pw-line" key={index}>
                <i className="pw-cb" />
              </div>
            ))}
          </section>
        </div>
      </div>

      <footer className="pw-foot">
        <span>
          <b>CalendarPRO</b> · Parrita Labs
        </span>
        <span>
          {t("printWeek.printedOn", {
            date: new Intl.DateTimeFormat(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(today),
          })}
        </span>
      </footer>
    </section>
  );
}
