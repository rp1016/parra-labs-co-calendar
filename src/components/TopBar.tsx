import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  List,
  Pencil,
  Search,
  Settings,
  Square,
} from "lucide-react";
import { useMemo } from "react";
import { localeOf, useT } from "../i18n";
import { formatLongDate, formatMonthYear, formatShortDate, parseDateKey, startOfWeek, endOfWeek } from "../lib/dates";
import { useAppStore } from "../state/store";
import { Brand } from "./Brand";

const VIEWS = [
  { id: "month", icon: CalendarDays },
  { id: "week", icon: Columns3 },
  { id: "day", icon: Square },
  { id: "agenda", icon: List },
] as const;

export function TopBar() {
  const t = useT();
  const cursor = useAppStore((state) => state.cursor);
  const view = useAppStore((state) => state.view);
  const weekStartsOn = useAppStore((state) => state.data.settings.weekStartsOn);
  const language = useAppStore((state) => state.data.settings.language);
  const setView = useAppStore((state) => state.setView);
  const shiftPeriod = useAppStore((state) => state.shiftPeriod);
  const goToday = useAppStore((state) => state.goToday);
  const setSearchOpen = useAppStore((state) => state.setSearchOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const selectedDay = useAppStore((state) => state.selectedDay);
  const openEditor = useAppStore((state) => state.openEditor);

  const locale = localeOf(language);
  const title = useMemo(() => {
    const day = parseDateKey(cursor);
    if (view === "month") {
      const label = formatMonthYear(day, locale);
      // Spanish month names are lowercase: "octubre de 2026".
      return language === "es" ? label.charAt(0).toLocaleLowerCase() + label.slice(1) : label;
    }
    if (view === "week") {
      const start = startOfWeek(day, weekStartsOn);
      const end = endOfWeek(day, weekStartsOn);
      const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(end);
      if (start.getMonth() === end.getMonth()) {
        return language === "es"
          ? `${start.getDate()} – ${end.getDate()} de ${month}`
          : `${month} ${start.getDate()} – ${end.getDate()}`;
      }
      return `${formatShortDate(start, locale)} – ${formatShortDate(end, locale)}`;
    }
    if (view === "day") return formatLongDate(day, locale);
    return t("views.agenda");
  }, [cursor, view, locale, language, weekStartsOn, t]);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Brand />
      </div>

      <div className="period">
        <h1 className="period-title">{title}</h1>
      </div>

      <nav className="segmented" aria-label={t("views.label")}>
        {VIEWS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
              title={t(`views.${item.id}`)}
            >
              <Icon size={14} />
              <span>{t(`views.${item.id}`)}</span>
            </button>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <div className="period-nav">
          <button onClick={() => shiftPeriod(-1)} aria-label={t("actions.previous")}>
            <ChevronLeft size={15} />
          </button>
          <span className="sep" />
          <button className="today-label" onClick={goToday}>
            {t("actions.today")}
          </button>
          <span className="sep" />
          <button onClick={() => shiftPeriod(1)} aria-label={t("actions.next")}>
            <ChevronRight size={15} />
          </button>
        </div>

        <button
          className="icon-btn"
          onClick={() => setSearchOpen(true)}
          aria-label={t("nav.search")}
          title={`${t("nav.search")} (Ctrl+K)`}
        >
          <Search size={17} />
        </button>
        <button
          className="icon-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
        >
          <Settings size={17} />
        </button>
        <button
          className="icon-btn primary"
          onClick={() => openEditor({ date: selectedDay })}
          aria-label={t("actions.newEvent")}
          title={t("actions.newEvent")}
        >
          <Pencil size={15} />
        </button>
      </div>
    </header>
  );
}
