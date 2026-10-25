import { useMemo, type CSSProperties } from "react";
import { CalendarDays, Lock, Plus, StickyNote } from "lucide-react";
import { localeOf, useT } from "../i18n";
import {
  addDays,
  endOfDay,
  formatTime,
  isToday,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "../lib/dates";
import { eventClasses, hidesDetails } from "../lib/eventVisual";
import { useAppStore } from "../state/store";
import { useCalendarColors, useOccurrences } from "../hooks/useCalendarData";

/** "Sáb, 24 de octubre" — short, capitalized, no year. */
function agendaDate(day: Date, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(day);
  return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}

export function RightRail() {
  const t = useT();
  const selectedDay = useAppStore((state) => state.selectedDay);
  const language = useAppStore((state) => state.data.settings.language);
  const use24h = useAppStore((state) => state.data.settings.use24h);
  const selectDay = useAppStore((state) => state.selectDay);
  const setCursor = useAppStore((state) => state.setCursor);
  const goToday = useAppStore((state) => state.goToday);
  const setSection = useAppStore((state) => state.setSection);
  const openEditor = useAppStore((state) => state.openEditor);

  const locale = localeOf(language);
  const days = useMemo(() => {
    const first = parseDateKey(selectedDay);
    return Array.from({ length: 7 }, (_, index) => addDays(first, index));
  }, [selectedDay]);

  const occurrences = useOccurrences(startOfDay(days[0]), endOfDay(days[6]));
  const colors = useCalendarColors();

  const byDay = useMemo(() => {
    const map = new Map<string, typeof occurrences>();
    for (const day of days) {
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
  }, [days, occurrences]);

  const tomorrowKey = toDateKey(addDays(new Date(), 1));

  return (
    <aside className="rail">
      <div className="rail-tabs">
        <div className="rail-tabgroup">
          <button className="rail-tab active">
            <CalendarDays size={14} />
            {t("views.agenda")}
          </button>
          <button
            className="rail-tab icon"
            onClick={() => setSection("notes")}
            title={t("nav.notes")}
            aria-label={t("nav.notes")}
          >
            <StickyNote size={14} />
          </button>
        </div>
        <button
          className="rail-today"
          onClick={() => {
            goToday();
            selectDay(toDateKey(new Date()));
          }}
        >
          {t("actions.today")}
        </button>
      </div>

      <div className="rail-body">
        {days.map((day) => {
          const key = toDateKey(day);
          const items = byDay.get(key) ?? [];
          const today = isToday(day);

          return (
            <div className="rail-group" key={key}>
              <div className="rail-group-head">
                <button
                  className="rail-group-title"
                  onClick={() => {
                    selectDay(key);
                    setCursor(key);
                  }}
                >
                  <b>{agendaDate(day, locale)}</b>
                  {today && <span className="rail-badge">{t("actions.today")}</span>}
                  {key === tomorrowKey && (
                    <span className="rail-badge muted">{t("common.tomorrow")}</span>
                  )}
                </button>
                <button
                  className="rail-add"
                  onClick={() => {
                    selectDay(key);
                    setCursor(key);
                    openEditor({ date: key });
                  }}
                  title={t("event.new")}
                  aria-label={t("event.new")}
                >
                  <Plus size={16} />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="rail-empty">{t("rail.noEvents")}</div>
              ) : (
                items.map((item) => {
                  const hidden = hidesDetails(item.event);
                  return (
                    <button
                      key={item.key}
                      className={`rail-line ${eventClasses(item.event)}`}
                      style={
                        {
                          "--event": colors[item.event.calendarId] ?? "var(--accent)",
                        } as CSSProperties
                      }
                      onClick={() =>
                        openEditor({ id: item.event.id, date: toDateKey(item.start) })
                      }
                      title={item.event.title}
                    >
                      <span className="rail-time">
                        {item.event.allDay
                          ? t("common.allDay")
                          : formatTime(item.start, locale, use24h)}
                      </span>
                      <span className="rail-title">
                        {hidden && <Lock size={10} />}{" "}
                        {item.event.title || t("notes.untitled")}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
