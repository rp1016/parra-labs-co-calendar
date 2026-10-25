import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Download,
  FileJson,
  FileText,
  Flower2,
  FolderOpen,
  Globe2,
  HardDrive,
  Info,
  LayoutPanelLeft,
  Palette,
  Printer,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { useT } from "../i18n";
import {
  autoBackupPath,
  dataFilePath,
  ensureNotificationPermission,
  openPath,
  openTextFile,
  revealDataFile,
  saveTextFile,
} from "../lib/api";
import {
  buildBackup,
  eventsToMarkdown,
  exportFileName,
  notesToMarkdown,
  parseBackup,
} from "../lib/exporters";
import { HOLIDAY_COUNTRIES } from "../lib/holidays";
import { buildICS } from "../lib/ics";
import { parseICS } from "../lib/icsImport";
import { ART_THEMES, artBackground } from "../lib/art";
import {
  ACCENTS,
  THEMES,
  TIME_ZONES,
  type AccentName,
  type ArtThemeId,
  type Language,
  type ThemeName,
} from "../lib/types";
import { useAppStore } from "../state/store";
import { confirmAction } from "../state/confirm";

const SWATCHES: Record<ThemeName, [string, string, string]> = {
  auto: ["#ffffff", "#f3f3f3", "#2b2b2b"],
  light: ["#ffffff", "#f3f3f3", "#2b2b2b"],
  dark: ["#17171a", "#2c2c32", "#e7e7ea"],
  midnight: ["#0b1020", "#1b2a4d", "#dde5f7"],
  sepia: ["#f8f1e4", "#ece0cc", "#423729"],
  contrast: ["#000000", "#2e2e2e", "#ffffff"],
};

type TabId = "general" | "calendar" | "appearance" | "data";

export function SettingsModal() {
  const t = useT();
  const data = useAppStore((state) => state.data);
  const settings = data.settings;
  const artPreview = artBackground(settings.artTheme);
  const close = useAppStore((state) => state.setSettingsOpen);
  const setAboutOpen = useAppStore((state) => state.setAboutOpen);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const replaceData = useAppStore((state) => state.replaceData);
  const importEvents = useAppStore((state) => state.importEvents);
  const addHolidayCalendar = useAppStore((state) => state.addHolidayCalendar);
  const pushToast = useAppStore((state) => state.pushToast);

  const [tab, setTab] = useState<TabId>("general");
  const [location, setLocation] = useState("…");
  const [country, setCountry] = useState("ES");
  const [holidayYears, setHolidayYears] = useState("1");

  const TABS: { id: TabId; label: string; icon: typeof Settings }[] = [
    { id: "general", label: t("settings.tab.general"), icon: Settings },
    { id: "calendar", label: t("settings.tab.calendar"), icon: CalendarDays },
    { id: "appearance", label: t("settings.tab.appearance"), icon: Palette },
    { id: "data", label: t("settings.tab.data"), icon: HardDrive },
  ];

  useEffect(() => {
    let alive = true;
    void dataFilePath()
      .then((path) => {
        if (alive) setLocation(path);
      })
      .catch(() => {
        if (alive) setLocation("—");
      });
    return () => {
      alive = false;
    };
  }, []);

  const exportBackup = async () => {
    const ok = await saveTextFile(
      exportFileName("backup"),
      buildBackup(data),
      "JSON",
      ["json"],
      "application/json",
    );
    if (ok) pushToast(t("toast.exported"), "success");
  };

  /** Export handlers must never surface an unhandled rejection. */
  const runExport = async (task: () => Promise<void>) => {
    try {
      await task();
    } catch {
      pushToast(t("toast.exportError"), "error");
    }
  };

  const exportIcs = async () => {
    if (data.events.length === 0) {
      pushToast(t("toast.nothingToExport"), "info");
      return;
    }
    const ok = await saveTextFile(
      exportFileName("ics"),
      buildICS(data.events, "CalendarPRO"),
      "iCalendar",
      ["ics"],
      "text/calendar",
    );
    if (ok) pushToast(t("toast.exported"), "success");
  };

  const exportNotes = async () => {
    if (data.notes.length === 0) {
      pushToast(t("toast.nothingToExport"), "info");
      return;
    }
    const ok = await saveTextFile(
      exportFileName("notes"),
      notesToMarkdown(data.notes, settings.language === "es" ? "es-ES" : "en-US"),
      "Markdown",
      ["md"],
      "text/markdown",
    );
    if (ok) pushToast(t("toast.exported"), "success");
  };

  const exportAgenda = async () => {
    if (data.events.length === 0) {
      pushToast(t("toast.nothingToExport"), "info");
      return;
    }
    const ok = await saveTextFile(
      exportFileName("events"),
      eventsToMarkdown(data.events, settings.language === "es" ? "es-ES" : "en-US"),
      "Markdown",
      ["md"],
      "text/markdown",
    );
    if (ok) pushToast(t("toast.exported"), "success");
  };

  const importBackup = async () => {
    const text = await openTextFile("JSON", ["json"]).catch(() => null);
    if (!text) return;
    try {
      const parsed = parseBackup(text);
      if (!(await confirmAction(t("settings.importConfirm"), { confirmLabel: t("actions.continue") }))) {
        return;
      }
      replaceData(parsed);
      pushToast(t("toast.imported"), "success");
    } catch {
      pushToast(t("toast.importError"), "error");
    }
  };

  const importCalendar = async () => {
    const text = await openTextFile("iCalendar", ["ics", "ical", "ifb"]).catch(() => null);
    if (!text) return;
    try {
      const parsed = parseICS(text, "__import__");
      if (parsed.events.length === 0) {
        pushToast(t("settings.importIcsEmpty"), "info");
        return;
      }
      const name =
        parsed.calendarName || (settings.language === "es" ? "Importado" : "Imported");
      if (
        !(await confirmAction(
          t("settings.importIcsConfirm", { count: parsed.events.length, name }),
          { confirmLabel: t("actions.import") },
        ))
      ) {
        return;
      }
      const result = importEvents(name, parsed.events);
      if (result.added === 0) pushToast(t("toast.icsNone"), "info");
      else pushToast(t("toast.icsImported", { count: result.added, name }), "success");
      if (parsed.limitations.length > 0) {
        pushToast(t("toast.icsLimitations", { detail: parsed.limitations[0] }), "info");
      }
    } catch {
      pushToast(t("toast.icsError"), "error");
    }
  };

  const addHolidays = () => {
    const first = new Date().getFullYear();
    const years = Array.from({ length: Number(holidayYears) }, (_, index) => first + index);
    const result = addHolidayCalendar(country, years);
    if (result.added > 0) {
      pushToast(t("toast.holidaysAdded", { count: result.added }), "success");
    } else {
      pushToast(t("toast.holidaysNone"), "info");
    }
  };

  const toggleNotifications = async (checked: boolean) => {
    if (!checked) {
      updateSettings({ notifications: false });
      return;
    }
    const granted = await ensureNotificationPermission();
    if (!granted) {
      pushToast(t("toast.permissionDenied"), "error");
      return;
    }
    updateSettings({ notifications: true });
  };

  const activeLabel = TABS.find((item) => item.id === tab)?.label ?? t("settings.title");

  return (
    <div className="modal-backdrop sheet-backdrop" onMouseDown={() => close(false)}>
      <div className="settings-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <aside className="settings-nav">
          <h2>{t("settings.title")}</h2>

          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`settings-nav-item ${tab === item.id ? "active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}

          <div className="settings-nav-sep" />

          <button
            className="settings-nav-item"
            onClick={() => {
              close(false);
              setAboutOpen(true);
            }}
          >
            <Info size={16} />
            {t("about.title")}
          </button>

          <div className="settings-nav-foot">
            <img src="/app-icon.svg" alt="" />
            <div>
              <b>CalendarPRO</b>
              <span>{t("app.by")}</span>
            </div>
          </div>
        </aside>

        <section className="settings-pane">
          <div className="settings-pane-head">
            <h3>{activeLabel}</h3>
            <button
              className="pane-close"
              onClick={() => close(false)}
              aria-label={t("actions.close")}
            >
              <X size={17} />
            </button>
          </div>

          <div className="settings-pane-body">
            {tab === "general" && (
              <>
                <div className="settings-group-title">{t("settings.group.regional")}</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <Globe2 size={15} />
                      </span>
                      <div>
                        {t("settings.language")}
                        <div className="sub">Español / English</div>
                      </div>
                    </div>
                    <select
                      value={settings.language}
                      onChange={(event) =>
                        updateSettings({ language: event.target.value as Language })
                      }
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <CalendarDays size={15} />
                      </span>
                      <div>{t("settings.weekStart")}</div>
                    </div>
                    <select
                      value={settings.weekStartsOn}
                      onChange={(event) =>
                        updateSettings({ weekStartsOn: Number(event.target.value) === 0 ? 0 : 1 })
                      }
                    >
                      <option value={1}>{t("settings.monday")}</option>
                      <option value={0}>{t("settings.sunday")}</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <ClockIcon />
                      </span>
                      <div>{t("settings.timeFormat")}</div>
                    </div>
                    <select
                      value={settings.use24h ? "24" : "12"}
                      onChange={(event) => updateSettings({ use24h: event.target.value === "24" })}
                    >
                      <option value="24">{t("settings.24h")}</option>
                      <option value="12">{t("settings.12h")}</option>
                    </select>
                  </div>
                </div>

                <div className="settings-group-title">{t("settings.group.alerts")}</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <Bell size={15} />
                      </span>
                      <div>
                        {t("settings.notifications")}
                        <div className="sub">{t("settings.localNote")}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(event) => void toggleNotifications(event.target.checked)}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "calendar" && (
              <>
                <div className="settings-group-title">{t("settings.group.calendar")}</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <CalendarDays size={15} />
                      </span>
                      <div>{t("settings.weekNumbers")}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showWeekNumbers}
                      onChange={(event) => updateSettings({ showWeekNumbers: event.target.checked })}
                    />
                  </div>

                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <Globe2 size={15} />
                      </span>
                      <div>{t("settings.secondTimeZone")}</div>
                    </div>
                    <select
                      value={settings.secondTimeZone ?? ""}
                      onChange={(event) =>
                        updateSettings({ secondTimeZone: event.target.value || null })
                      }
                    >
                      <option value="">{t("settings.none")}</option>
                      {TIME_ZONES.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="settings-group-title">{t("settings.holidays")}</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <Globe2 size={15} />
                      </span>
                      <div>{t("settings.country")}</div>
                    </div>
                    <select value={country} onChange={(event) => setCountry(event.target.value)}>
                      {HOLIDAY_COUNTRIES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name[settings.language]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <CalendarDays size={15} />
                      </span>
                      <div>{t("settings.years")}</div>
                    </div>
                    <select
                      value={holidayYears}
                      onChange={(event) => setHolidayYears(event.target.value)}
                    >
                      <option value="1">{t("settings.thisYear")}</option>
                      <option value="2">{t("settings.twoYears")}</option>
                      <option value="3">{t("settings.threeYears")}</option>
                    </select>
                  </div>

                  <div className="settings-actions">
                    <button className="btn" onClick={addHolidays}>
                      <CalendarDays size={15} />
                      {t("settings.addHolidays")}
                    </button>
                  </div>
                  <p className="settings-note">{t("settings.holidaysHint")}</p>
                </div>
              </>
            )}

            {tab === "appearance" && (
              <>
                <div className="settings-group-title">{t("settings.theme")}</div>
                <div className="settings-card">
                  <div className="theme-grid">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        className={`theme-card ${settings.theme === theme.id ? "active" : ""}`}
                        onClick={() => updateSettings({ theme: theme.id })}
                      >
                        <span className="theme-swatch">
                          {SWATCHES[theme.id].map((color, index) => (
                            <i key={index} style={{ background: color }} />
                          ))}
                        </span>
                        <span>{t(`theme.${theme.id}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-group-title">{t("settings.accent")}</div>
                <div className="settings-card">
                  <div className="accent-row">
                    {ACCENTS.map((accent) => (
                      <button
                        key={accent.id}
                        className={`accent-dot ${settings.accent === accent.id ? "active" : ""}`}
                        style={{ background: accent.hex }}
                        title={accent.label}
                        aria-label={accent.label}
                        onClick={() => updateSettings({ accent: accent.id as AccentName })}
                      />
                    ))}
                  </div>
                </div>

                <div className="settings-group-title">{t("settings.artGroup")}</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <Flower2 size={15} />
                      </span>
                      <div>
                        {t("settings.artTheme")}
                        <div className="sub">{t("settings.artHint")}</div>
                      </div>
                    </div>
                    <select
                      value={settings.artTheme}
                      onChange={(event) =>
                        updateSettings({ artTheme: event.target.value as ArtThemeId })
                      }
                    >
                      {ART_THEMES.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {t(`art.${theme.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {artPreview && (
                    <div className="art-preview">
                      <div className="art-preview-sheet" aria-hidden="true">
                        <i style={{ backgroundImage: artPreview }} />
                        <span className="art-preview-grid" />
                      </div>
                      <small>{t("settings.artPreview")}</small>
                    </div>
                  )}
                </div>

                <div className="settings-group-title">{t("settings.group.application")}</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <LayoutPanelLeft size={15} />
                      </span>
                      <div>
                        {t("settings.compact")}
                        <div className="sub">{t("settings.compactHint")}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.compact}
                      onChange={(event) => updateSettings({ compact: event.target.checked })}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "data" && (
              <>
                <div className="settings-group-title">{t("settings.data")}</div>
                <div className="settings-card">
                  <div className="setting-row" style={{ alignItems: "flex-start" }}>
                    <div className="setting-main" style={{ flex: 1 }}>
                      <span className="setting-icon">
                        <HardDrive size={15} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {t("settings.dataLocation")}
                        <div className="data-box" style={{ marginTop: 6 }}>
                          {location}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="setting-row">
                    <div className="setting-main">
                      <span className="setting-icon">
                        <FolderOpen size={15} />
                      </span>
                      <div>
                        {t("settings.autoBackup")}
                        <div className="sub">{t("settings.autoBackupHint")}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(event) => updateSettings({ autoBackup: event.target.checked })}
                    />
                  </div>

                  <div className="settings-actions">
                    <button
                      className="btn"
                      onClick={() =>
                        void autoBackupPath()
                          .then((path) => (path ? openPath(path) : undefined))
                          .catch(() => undefined)
                      }
                      disabled={!settings.autoBackup}
                    >
                      <FolderOpen size={15} />
                      {t("settings.backupFolder")}
                    </button>
                    <button className="btn" onClick={() => revealDataFile().catch(() => undefined)}>
                      <FolderOpen size={15} />
                      {t("settings.reveal")}
                    </button>
                    <button className="btn" onClick={() => window.print()}>
                      <Printer size={15} />
                      {t("actions.print")}
                    </button>
                  </div>
                </div>

                <div className="settings-group-title">{t("settings.group.transfer")}</div>
                <div className="settings-card">
                  <div className="export-grid">
                    <button className="btn" onClick={() => void runExport(exportBackup)}>
                      <FileJson size={15} />
                      {t("settings.exportBackup")}
                    </button>
                    <button className="btn" onClick={() => void runExport(importBackup)}>
                      <Upload size={15} />
                      {t("settings.importBackup")}
                    </button>
                    <button className="btn" onClick={() => void runExport(importCalendar)}>
                      <Upload size={15} />
                      {t("settings.importIcs")}
                    </button>
                    <button className="btn" onClick={() => void runExport(exportIcs)}>
                      <CalendarDays size={15} />
                      {t("settings.exportIcs")}
                    </button>
                    <button className="btn" onClick={() => void runExport(exportNotes)}>
                      <FileText size={15} />
                      {t("settings.exportMarkdown")}
                    </button>
                    <button className="btn" onClick={() => void runExport(exportAgenda)}>
                      <Download size={15} />
                      {t("settings.exportAgenda")}
                    </button>
                  </div>
                  <p className="settings-note">{t("settings.localNote")}</p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Local tiny clock glyph so the settings file does not import another icon set entry. */
function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
