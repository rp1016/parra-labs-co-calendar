import { useEffect, useState } from "react";
import { AboutDialog } from "./components/AboutDialog";
import { AgendaView } from "./components/AgendaView";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DayView } from "./components/DayView";
import { EventDialog } from "./components/EventDialog";
import { MonthView } from "./components/MonthView";
import { NotesView } from "./components/NotesView";
import { PrintSheet } from "./components/PrintSheet";
import { RightRail } from "./components/RightRail";
import { SearchOverlay } from "./components/SearchOverlay";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { Toasts } from "./components/Toasts";
import { TopBar } from "./components/TopBar";
import { WeekView } from "./components/WeekView";
import { useReminders } from "./hooks/useReminders";
import { useShortcuts } from "./hooks/useShortcuts";
import { useT } from "./i18n";
import { autoBackup } from "./lib/api";
import { buildBackup } from "./lib/exporters";
import { useAppStore } from "./state/store";

let hydrationStarted = false;
let backupStarted = false;

export default function App() {
  const t = useT();
  const ready = useAppStore((state) => state.ready);
  const hydrate = useAppStore((state) => state.hydrate);
  const section = useAppStore((state) => state.section);
  const view = useAppStore((state) => state.view);
  const settings = useAppStore((state) => state.data.settings);
  const editor = useAppStore((state) => state.editor);
  const searchOpen = useAppStore((state) => state.searchOpen);
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const aboutOpen = useAppStore((state) => state.aboutOpen);

  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    if (hydrationStarted) return;
    hydrationStarted = true;
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ready || !settings.autoBackup || backupStarted) return;
    backupStarted = true;
    void autoBackup(buildBackup(useAppStore.getState().data)).catch(() => {
      useAppStore.getState().pushToast(t("toast.autoBackupError"), "error");
    });
  }, [ready, settings.autoBackup, t]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme =
    settings.theme === "auto" ? (systemDark ? "dark" : "light") : settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = settings.accent;
    root.lang = settings.language;
    document.title = "CalendarPRO — by Parrita Labs";
  }, [resolvedTheme, settings.accent, settings.language]);

  useShortcuts();
  useReminders();

  if (!ready) {
    return (
      <div className="splash">
        <img src="/app-icon.svg" alt="" />
        <span>{t("app.name")}</span>
      </div>
    );
  }

  const noRail = settings.compact || section === "notes";

  return (
    <>
      <div className={`app ${noRail ? "no-rail" : ""}`}>
        <TopBar />
        <Sidebar />

        <main className="main">
          {section === "notes" ? (
            <NotesView />
          ) : view === "month" ? (
            <MonthView />
          ) : view === "week" ? (
            <WeekView />
          ) : view === "day" ? (
            <DayView />
          ) : (
            <AgendaView />
          )}
        </main>

        <RightRail />

        {editor.open && (
          <EventDialog
            key={`${editor.id ?? "new"}-${editor.date}-${editor.time}`}
          />
        )}
        {searchOpen && <SearchOverlay />}
        {settingsOpen && <SettingsModal />}
        {aboutOpen && <AboutDialog />}
        <ConfirmDialog />

        <Toasts />
      </div>

      <PrintSheet />
    </>
  );
}
