import { useMemo, type CSSProperties } from "react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  endOfDay,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatTime,
  isoWeek,
  monthGrid,
  parseDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
  weekdayOrder,
} from "../lib/dates";
import { eventClasses, hidesDetails } from "../lib/eventVisual";
import { renderMarkdown } from "../lib/markdown";
import type { Occurrence } from "../lib/types";
import { useAppStore } from "../state/store";
import { useCalendarColors, useOccurrences } from "../hooks/useCalendarData";

/** A quiet, paper-first rendering of the current view. It is always mounted
 *  but only visible through `@media print`, so Ctrl/Cmd+P from the webview and
 *  the toolbar button produce exactly the same sheet. */
export function PrintSheet() {
  const t = useT();
  const section = useAppStore((state) => state.section);
  const view = useAppStore((state) => state.view);
  const cursor = useAppStore((state) => state.cursor);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const weekStartsOn = useAppStore((state) => state.data.settings.weekStartsOn);
  const showWeekNumbers = useAppStore((state) => state.data.settings.showWeekNumbers);
  const notes = useAppStore((state) => state.data.notes);
  const activeNoteId = useAppStore((state) => state.activeNoteId);

  const locale = localeOf(language);
  const anchor = useMemo(() => parseDateKey(cursor), [cursor]);

  const range = useMemo(() => {
    if (view === "month") {
      const grid = monthGrid(anchor.getFullYear(), anchor.getMonth(), weekStartsOn);
      return { from: startOfDay(grid[0]), to: endOfDay(grid[41]), grid };
    }
    if (view === "week") {
      const from = startOfWeek(anchor, weekStartsOn);
      return { from, to: endOfDay(addDays(from, 6)), grid: [] as Date[] };
    }
    if (view === "day") {
      return { from: startOfDay(anchor), to: endOfDay(anchor), grid: [] as Date[] };
    }
    const from = startOfDay(anchor);
    return { from, to: endOfDay(addDays(from, 90)), grid: [] as Date[] };
  }, [anchor, view, weekStartsOn]);

  const occurrences = useOccurrences(range.from, range.to);
  const colors = useCalendarColors();

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const item of occurrences) {
      const key = toDateKey(item.start);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [occurrences]);

  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => range.grid.slice(index * 7, index * 7 + 7)),
    [range.grid],
  );

  const activeNote = notes.find((note) => note.id === activeNoteId) ?? notes[0];

  const title = useMemo(() => {
    if (section === "notes") return activeNote?.title || t("notes.title");
    if (view === "month") return formatMonthYear(anchor, locale);
    if (view === "week") {
      const start = startOfWeek(anchor, weekStartsOn);
      return `${formatShortDate(start, locale)} – ${formatShortDate(addDays(start, 6), locale)}`;
    }
    if (view === "day") return formatLongDate(anchor, locale);
    return t("views.agenda");
  }, [activeNote, anchor, locale, section, t, view, weekStartsOn]);

  const subtitle = useMemo(() => {
    if (section === "notes") return "";
    if (view === "month") {
      return `${formatShortDate(range.grid[0], locale)} – ${formatShortDate(range.grid[41], locale)}`;
    }
    if (view === "week") return formatLongDate(anchor, locale);
    return "";
  }, [anchor, locale, range.grid, section, view]);

  const timeLabel = (item: Occurrence) =>
    item.event.allDay
      ? t("common.allDay")
      : `${formatTime(item.start, locale, use24h)}–${formatTime(item.end, locale, use24h)}`;

  const eventsForDay = (day: Date): Occurrence[] => byDay.get(toDateKey(day)) ?? [];

  return (
    <section className="print-sheet print-only" aria-hidden="true">
      <header className="print-head">
        <div className="print-brand">
          <img src="/app-icon.svg" alt="" />
          <div>
            <div className="print-brand-name">
              <b>Calendar</b>
              <span>PRO</span>
            </div>
            <small>{t("app.by")}</small>
          </div>
        </div>
        <div className="print-title">
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </header>

      {section === "notes" ? (
        <article className="print-note">
          <h2>{activeNote?.title || t("notes.untitled")}</h2>
          {activeNote?.tags.length ? (
            <div className="print-tags">{activeNote.tags.map((tag) => `#${tag}`).join("  ")}</div>
          ) : null}
          {activeNote ? (
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeNote.body) }}
            />
          ) : (
            <p>{t("notes.empty")}</p>
          )}
        </article>
      ) : view === "month" ? (
        <div className="print-month">
          <div className={`print-month-head ${showWeekNumbers ? "with-weeks" : ""}`}>
            {showWeekNumbers && <span />}
            {weekdayOrder(weekStartsOn).map((index) => (
              <span key={index}>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + index))}</span>
            ))}
          </div>
          <div className="print-month-body">
            {weeks.map((week, weekIndex) => (
              <div className={`print-week ${showWeekNumbers ? "with-weeks" : ""}`} key={weekIndex}>
                {showWeekNumbers && <span className="print-weeknum">{isoWeek(week[0])}</span>}
                {week.map((day) => (
                  <div
                    className={`print-cell ${day.getMonth() !== anchor.getMonth() ? "out" : ""}`}
                    key={toDateKey(day)}
                  >
                    <span className="print-daynum">{day.getDate()}</span>
                    {eventsForDay(day).map((item) => (
                      <div
                        className={`print-chip ${eventClasses(item.event)}`}
                        key={item.key}
                        style={{ "--event": colors[item.event.calendarId] ?? "#4f46e5" } as CSSProperties}
                      >
                        {!item.event.allDay && <b>{formatTime(item.start, locale, use24h)}</b>}
                        <span>{item.event.title || t("notes.untitled")}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="print-list">
          {occurrences.length === 0 && <p className="print-empty">{t("empty.agenda")}</p>}
          {[...byDay.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, items]) => (
              <section className="print-day" key={key}>
                <h3>{formatLongDate(parseDateKey(key), locale)}</h3>
                {items.map((item) => (
                  <div className={`print-event ${eventClasses(item.event)}`} key={item.key}>
                    <span className="print-time">{timeLabel(item)}</span>
                    <span className="print-name">{item.event.title || t("notes.untitled")}</span>
                    {!hidesDetails(item.event) && item.event.location && (
                      <span className="print-place">{item.event.location}</span>
                    )}
                    {!hidesDetails(item.event) && item.event.notes && (
                      <span className="print-notes">{item.event.notes}</span>
                    )}
                  </div>
                ))}
              </section>
            ))}
        </div>
      )}

      <footer className="print-foot">
        {t("print.generated")} ·{" "}
        {new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date())}
      </footer>
    </section>
  );
}
