import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { translate, localeOf } from "../i18n";
import { isDesktop, loadData, miniAddEvent, miniToggleDone } from "../lib/api";
import { XmasScene } from "./XmasScene";
import { MoonIcon } from "./MoonIcon";
import { zodiacOf } from "../lib/zodiac";
import { moonPhaseOfDay } from "../lib/moon";
import { buildQuickEvent, pickQuickSlot, quickCalendarId } from "../lib/quickAdd";
import {
  addMonths,
  endOfDay,
  formatLongDate,
  formatTime,
  formatWeekday,
  isSameDay,
  monthGrid,
  parseDateKey,
  startOfDay,
  toDateKey,
  weekdayOrder,
} from "../lib/dates";
import { artBackground } from "../lib/art";
import { holidayEvents } from "../lib/holidays";
import { normalizeData } from "../lib/normalize";
import { occurrencesBetween, sortOccurrences } from "../lib/recurrence";
import { defaultData, miniStyleFor, type AppData, type Occurrence } from "../lib/types";
import { visibleEvents } from "../state/store";

/** Popup shown from the tray icon. It never saves its own copy of the data:
 *  quick entries and check-offs go through backend commands that change only
 *  that one item, and the main window reloads when it is told about it. */
export function MiniCalendar() {
  const [data, setData] = useState<AppData>(() => defaultData());
  const [loaded, setLoaded] = useState(false);
  const [month, setMonth] = useState(() => toDateKey(new Date()));
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const settings = data.settings;
  const language = settings.language;
  const t = useCallback(
    (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language],
  );
  const locale = localeOf(language);

  const refresh = useCallback(() => {
    loadData()
      .then((stored) => {
        setData(stored ? normalizeData(stored) : defaultData());
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    const onShow = () => {
      if (document.visibilityState === "hidden") return;
      const today = toDateKey(new Date());
      setMonth(today);
      setSelected(today);
      refresh();
    };
    window.addEventListener("focus", onShow);
    document.addEventListener("visibilitychange", onShow);
    const timer = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", onShow);
      clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme === "auto" ? (systemDark ? "dark" : "light") : settings.theme;
    root.dataset.accent = settings.accent;
    root.lang = language;
  }, [settings.theme, settings.accent, language, systemDark]);

  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
        getCurrentWindow().hide(),
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const anchor = parseDateKey(month);
  const grid = useMemo(
    () => monthGrid(anchor.getFullYear(), anchor.getMonth(), settings.weekStartsOn),
    [month, settings.weekStartsOn],
  );

  const holidayCalendarIds = useMemo(
    () =>
      new Set(
        data.calendars
          .filter((calendar) => calendar.kind === "holiday" && calendar.visible)
          .map((calendar) => calendar.id),
      ),
    [data.calendars],
  );

  const occurrences = useMemo(() => {
    const from = startOfDay(grid[0]);
    const to = endOfDay(grid[41]);
    const events = visibleEvents(data);

    // Holidays saved in the data file only cover the years chosen in Settings,
    // so the visible months are completed from the built-in tables. The
    // deterministic uid keeps them from duplicating the saved ones.
    const known = new Set(events.map((event) => event.uid).filter(Boolean));
    const years = [...new Set([from.getFullYear(), to.getFullYear()])];
    for (const calendar of data.calendars) {
      if (calendar.kind !== "holiday" || !calendar.visible || !calendar.country) continue;
      for (const event of holidayEvents(calendar.country, years, calendar.id, language)) {
        if (event.uid && known.has(event.uid)) continue;
        events.push(event);
      }
    }

    return sortOccurrences(events.flatMap((event) => occurrencesBetween(event, from, to)));
  }, [data, grid, language]);

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

  const colors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const calendar of data.calendars) map[calendar.id] = calendar.color;
    return map;
  }, [data.calendars]);

  const art = artBackground(settings.artTheme);
  const miniStyle = miniStyleFor(settings);
  const today = new Date();
  const selectedDate = parseDateKey(selected);
  const dayItems = byDay.get(selected) ?? [];
  const weekdays = weekdayOrder(settings.weekStartsOn).map((index) =>
    formatWeekday(new Date(2024, 0, 7 + index), locale, "narrow"),
  );

  const december = anchor.getMonth() === 11;
  const [draft, setDraft] = useState("");

  const nextSlot = () => {
    const busy = (byDay.get(selected) ?? [])
      .filter((item) => !item.event.allDay && !holidayCalendarIds.has(item.event.calendarId))
      .map((item) => ({ start: item.start, end: item.end }));
    return pickQuickSlot(parseDateKey(selected), busy);
  };
  const slotHint = draft.trim() ? nextSlot().start.slice(11, 16) : "";

  const addQuick = () => {
    const title = draft.trim();
    if (!title || !isDesktop) return;
    const event = buildQuickEvent(title, quickCalendarId(data), nextSlot());
    setDraft("");
    miniAddEvent(event).then((next) => setData(normalizeData(next))).catch(() => refresh());
  };

  const toggleDone = (eventId: string, date: string) => {
    if (!isDesktop) return;
    miniToggleDone(eventId, date)
      .then((next) => setData(normalizeData(next)))
      .catch(() => refresh());
  };

  const openApp = () => {
    if (!isDesktop) return;
    void import("@tauri-apps/api/core").then(({ invoke }) => invoke("open_main"));
  };

  return (
    <div
      className={["mini", `mini-style-${miniStyle}`, december ? "is-december" : ""]
        .join(" ")
        .trim()}
    >
      {december && miniStyle !== "tradicional" ? (
        <div className="mini-banner mini-banner-xmas" aria-hidden="true">
          <XmasScene />
        </div>
      ) : miniStyle === "botanico" ? (
        <div
          className="mini-banner"
          aria-hidden="true"
          style={art ? { backgroundImage: art } : undefined}
        />
      ) : (
        art && <div className="mini-art" aria-hidden="true" style={{ backgroundImage: art }} />
      )}
      {december && (
        <div className="mini-xmas" aria-hidden="true">
          <span className="mini-lights" />
          <span className="flake f1">❄</span>
          <span className="flake f2">❅</span>
          <span className="flake f3">❆</span>
          <span className="flake f4">❄</span>
          <span className="flake f5">❅</span>
        </div>
      )}
      <header className="mini-head">
        <button
          type="button"
          className="icon-btn"
          aria-label={t("actions.previous")}
          onClick={() => setMonth(toDateKey(addMonths(anchor, -1)))}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="mini-title"
          title={t("actions.today")}
          onClick={() => {
            const key = toDateKey(new Date());
            setMonth(key);
            setSelected(key);
          }}
        >
          <span className="mini-month">
            {new Intl.DateTimeFormat(locale, { month: "long" }).format(anchor)}
          </span>
          <span className="mini-year">{anchor.getFullYear()}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={t("actions.next")}
          onClick={() => setMonth(toDateKey(addMonths(anchor, 1)))}
        >
          <ChevronRight size={16} />
        </button>
      </header>

      <div className="mini-grid" role="grid">
        {weekdays.map((label, index) => (
          <span key={`${label}-${index}`} className="mini-dow">
            {label}
          </span>
        ))}
        {grid.map((day) => {
          const key = toDateKey(day);
          const events = byDay.get(key) ?? [];
          const isHoliday = events.some((item) => holidayCalendarIds.has(item.event.calendarId));
          const hasOwnEvents = events.some((item) => !holidayCalendarIds.has(item.event.calendarId));
          const classes = [
            "mini-day",
            isHoliday ? "is-holiday" : "",
            day.getMonth() !== anchor.getMonth() ? "is-out" : "",
            day.getDay() === 0 ? "is-sun" : "",
            isSameDay(day, today) ? "is-today" : "",
            key === selected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={classes}
              title={
                isHoliday
                  ? events
                      .filter((item) => holidayCalendarIds.has(item.event.calendarId))
                      .map((item) => item.event.title)
                      .join(" · ")
                  : undefined
              }
              onClick={() => setSelected(key)}
            >
              <span>{day.getDate()}</span>
              <i className={hasOwnEvents ? "has-events" : ""} />
              {miniStyle === "tradicional" && moonPhaseOfDay(day) && (
                <span className="mini-moon">
                  <MoonIcon phase={moonPhaseOfDay(day)!} size={9} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="mini-events" aria-live="polite">
        <h2>
          {isSameDay(selectedDate, today)
            ? `${t("actions.today")} · ${formatLongDate(selectedDate, locale)}, ${selectedDate.getFullYear()}`
            : `${formatLongDate(selectedDate, locale)}, ${selectedDate.getFullYear()}`}
        {miniStyle === "tradicional" && (
            <span className="mini-zodiac"> · {`${zodiacOf(selectedDate).symbol}︎`} {zodiacOf(selectedDate).name}</span>
          )}
        </h2>
        <div className="mini-list">
        {!loaded ? null : dayItems.length === 0 ? (
          <p className="mini-empty">{t("mini.noEvents")}</p>
        ) : (
          <ul>
            {dayItems.map((item) => {
              const isHoliday = holidayCalendarIds.has(item.event.calendarId);
              const itemDate = toDateKey(item.start);
              const done = item.event.doneDates?.includes(itemDate) ?? false;
              return (
              <li
                key={item.key}
                className={[isHoliday ? "is-holiday" : "", done ? "is-done" : ""].join(" ").trim() || undefined}
              >
                {!isHoliday && (
                  <input
                    type="checkbox"
                    className="mini-check"
                    checked={done}
                    aria-label={t("mini.markDone")}
                    onChange={() => toggleDone(item.event.id, itemDate)}
                  />
                )}
                <span
                  className="mini-dot"
                  style={{ background: colors[item.event.calendarId] ?? "var(--accent)" }}
                />
                <span className="mini-time">
                  {item.event.allDay
                    ? t("common.allDay")
                    : formatTime(item.start, locale, settings.use24h)}
                </span>
                <span className="mini-name">{item.event.title || t("mini.untitled")}</span>
              </li>
              );
            })}
          </ul>
        )}
        </div>
        {isDesktop && (
          <form
            className="mini-add"
            onSubmit={(event) => {
              event.preventDefault();
              addQuick();
            }}
          >
            <span className="mini-add-plus" aria-hidden="true">+</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("mini.addPlaceholder")}
              aria-label={t("mini.addPlaceholder")}
              maxLength={200}
            />
            {draft.trim() && <kbd className="mini-add-hint">↵ {slotHint}</kbd>}
          </form>
        )}
      </section>

      <footer className="mini-foot">
        <button type="button" className="btn" onClick={openApp}>
          <ExternalLink size={14} /> {t("mini.openApp")}
        </button>
      </footer>
    </div>
  );
}
